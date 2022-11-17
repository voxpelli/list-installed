import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';

import { readPackage } from 'read-pkg';

// TODO [engine:node@>=16.0.0]: We can use this natively now
/** @type {(input: string, searchValue: string | RegExp, replaceValue: string | ((substring: string, ...args: any[]) => string)) => string} */
// @ts-ignore
import replaceAll from 'string.prototype.replaceall';

/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

/**
 * @param {unknown} value
 * @returns {value is NodeJS.ErrnoException}
 */
const looksLikeAnErrnoException = (value) => value instanceof Error && 'code' in value && 'path' in value;

const PLATFORM_INDEPENDENT_SEPARATOR = '/';

/**
 * @param {string} moduleName
 * @returns {string}
 */
const platformIndependentRepresentation = (moduleName) => replaceAll(moduleName, pathModule.sep, PLATFORM_INDEPENDENT_SEPARATOR);

/**
 * @private
 * @param {string|import('fs').Dir} path
 * @param {boolean} [skipScoped]
 * @param {string} [prefix]
 * @returns {AsyncGenerator<string>}
 */
async function * _internalReaddirScoped (path, skipScoped, prefix) {
  const dir = (
    typeof path === 'string'
      ? await opendir(path)
      : path
  );

  if (!dir || typeof dir !== 'object') throw new TypeError('Invalid input to readdirScoped()');

  for await (const file of dir) {
    if (!file.isDirectory()) continue;

    const moduleName = (prefix || '') + file.name;

    if (file.name.startsWith('@')) {
      if (!skipScoped) yield * _internalReaddirScoped(pathModule.join(dir.path, file.name), false, moduleName + pathModule.sep);
    } else if (!file.name.startsWith('.')) {
      yield platformIndependentRepresentation(moduleName);
    }
  }
}

/**
 * Returns all directories in `path`, with the scoped directories (like `@foo`) expanded and joined with the directories directly beneath them
 *
 * Eg. `@foo` will get expanded to `@foo/abc` and `@foo/bar` if `abc` and `bar` are the two directories in `@foo`, though it will never expand to `@`- or `.`-prefixed subdirectories and will hence never return `@foo/@xyz` or `@foo/.bin`.
 *
 * Will not return any directory with a name that begins with `.`
 *
 * @param {string|import('fs').Dir} path The path to the directory, either absolute or relative to current working directory
 * @returns {AsyncGenerator<string>}
 */
export async function * readdirScoped (path) {
  yield * _internalReaddirScoped(path);
}

/**
 * @private
 * @param {import('fs').Dir} inputDir
 * @param {number} [depth]
 * @param {string} [prefix]
 * @returns {AsyncGenerator<string>}
 */
async function * _internalReaddirModuleTree (inputDir, depth = 0, prefix) {
  for await (const modulePath of _internalReaddirScoped(inputDir, false, prefix)) {
    yield platformIndependentRepresentation(modulePath);

    if (depth < 1) continue;

    const subModule = pathModule.join(prefix || '', modulePath, 'node_modules');
    const subModulePath = pathModule.join(inputDir.path, subModule);

    try {
      const dir = await opendir(subModulePath);
      yield * _internalReaddirModuleTree(dir, depth - 1, subModule + pathModule.sep);
    } catch (err) {
      if (looksLikeAnErrnoException(err) && err.code === 'ENOENT' && err.path === subModulePath) {
        // Fail silently
      } else {
        throw err;
      }
    }
  }
}

/**
 * Similar to {@link readdirScoped} but can also return nested modules
 *
 * For any result of {@link readdirScoped} a lookup towards a `node_modules` subdirectory of that result is done, with the result added and in turn also looked for `node_modules` subdirectories in until the specified `depth` has been reached.
 *
 * @param {string|import('fs').Dir} path The path to the directory, either absolute or relative to current working directory
 * @param {number} [depth=0] If not set or if set to 0, then behaves identical to {@link readdirScoped}
 * @returns {AsyncGenerator<string>}
 */
export async function * readdirModuleTree (path, depth = 0) {
  const dir = (
    typeof path === 'string'
      ? await opendir(path)
      : path
  );

  if (!dir || typeof dir !== 'object') throw new TypeError('Invalid input to readdirModuleTree()');

  yield * _internalReaddirModuleTree(dir, depth);
}

/**
 * Creates a generator for a list of top level installed modules of a project and their package.json files
 *
 * @param {string} path The path to the module, either absolute or relative to current working directory
 * @returns {AsyncGenerator<NormalizedPackageJson>}
 */
export async function * listInstalledGenerator (path) {
  if (typeof path !== 'string') throw new TypeError('Expected a string input to listInstalledGenerator()');

  const nodeModulesDir = pathModule.resolve(path, 'node_modules');

  /** @type {import('node:fs').Dir} */
  let dir;

  try {
    dir = await opendir(nodeModulesDir);
  } catch (err) {
    if (looksLikeAnErrnoException(err) && err.code === 'ENOENT' && err.path === nodeModulesDir) {
      throw new Error('Non-existing path set: ' + nodeModulesDir);
    }
    throw err;
  }

  for await (const relativeModulePath of readdirModuleTree(dir)) {
    const cwd = pathModule.join(nodeModulesDir, replaceAll(relativeModulePath, PLATFORM_INDEPENDENT_SEPARATOR, pathModule.sep));

    try {
      yield readPackage({ cwd });
    } catch {
      // If we fail to find or read a package.json – then just ignore that module path
    }
  }
}

/**
 * Creates a generator for a list of top level installed modules of a project and their package.json files
 *
 * @param {string} path The path to the module, either absolute or relative to current working directory
 * @returns {Promise<Map<string, NormalizedPackageJson>>}
 */
export async function listInstalled (path) {
  if (typeof path !== 'string') throw new TypeError('Expected a string input to listInstalled()');

  const nodeModulesDir = pathModule.resolve(path, 'node_modules');

  /**
   * Rather than using listInstalledGenerator() to sequentially get the data, we add all of the package reads here and does a Promise.all() later
   *
   * @type {Promise<NormalizedPackageJson>[]}
   */
  const pkgs = [];

  try {
    const dir = await opendir(nodeModulesDir);
    for await (const relativeModulePath of readdirModuleTree(dir)) {
      pkgs.push(readPackage({ cwd: pathModule.join(nodeModulesDir, relativeModulePath) }));
    }
  } catch (err) {
    if (looksLikeAnErrnoException(err) && err.code === 'ENOENT' && err.path === nodeModulesDir) {
      throw new Error('Non-existing path set: ' + nodeModulesDir);
    }
    throw err;
  }

  /** @type {Map<string, NormalizedPackageJson>} */
  const pkgMap = new Map();

  for (const pkg of await Promise.all(pkgs)) {
    if (pkg.name) pkgMap.set(pkg.name, pkg);
  }

  return pkgMap;
}

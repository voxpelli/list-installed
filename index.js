import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';

import { readPackage } from 'read-pkg';
import { bufferedAsyncMap } from 'buffered-async-iterable';

/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

/**
 * @callback FilterCallback
 * @param {NormalizedPackageJson} pkg
 * @param {string|undefined} alias
 * @returns {boolean|Promise<boolean>}
 */

/**
 * @typedef ListInstalledOptions
 * @property {FilterCallback} [filter]
 */

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
const platformIndependentRepresentation = (moduleName) => moduleName.replaceAll(pathModule.sep, PLATFORM_INDEPENDENT_SEPARATOR);

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

  yield * bufferedAsyncMap(dir, async function * (file) {
    if (!file.isDirectory()) return;

    const moduleName = (prefix || '') + file.name;

    if (file.name.startsWith('@')) {
      if (!skipScoped) {
        yield * _internalReaddirScoped(pathModule.join(dir.path, file.name), false, moduleName + pathModule.sep);
      }
    } else if (!file.name.startsWith('.')) {
      yield platformIndependentRepresentation(moduleName);
    }
  });
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
  yield * bufferedAsyncMap(_internalReaddirScoped(inputDir, false, prefix), async function * (modulePath) {
    yield platformIndependentRepresentation(modulePath);

    if (depth < 1) return;

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
  });
}

/**
 * Similar to {@link readdirScoped} but can also return nested modules
 *
 * For any result of {@link readdirScoped} a lookup towards a `node_modules` subdirectory of that result is done, with the result added and in turn also looked for `node_modules` subdirectories in until the specified `depth` has been reached.
 *
 * @param {string|import('fs').Dir} path The path to the directory, either absolute or relative to current working directory
 * @param {number} [depth] If not set or if set to 0, then behaves identical to {@link readdirScoped}
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
 * @param {ListInstalledOptions} options
 * @returns {AsyncGenerator<{ alias: string|undefined, pkg: NormalizedPackageJson }>}
 */
export async function * listInstalledGenerator (path, options = {}) {
  if (typeof path !== 'string') throw new TypeError('Expected a string input to listInstalledGenerator()');
  if (typeof options !== 'object') throw new TypeError('Expected options to be an object for listInstalled()');

  const { filter } = options;

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

  yield * bufferedAsyncMap(readdirModuleTree(dir), async function * (relativeModulePath) {
    const cwd = pathModule.join(nodeModulesDir, relativeModulePath.replaceAll(PLATFORM_INDEPENDENT_SEPARATOR, pathModule.sep));

    try {
      const pkg = await readPackage({ cwd });
      const alias = relativeModulePath === pkg.name ? undefined : relativeModulePath;

      if (!filter || await filter(pkg, alias)) {
        yield { alias, pkg };
      }
    } catch {
      // If we fail to find or read a package.json – then just ignore that module path
    }
  });
}

/**
 * Creates a generator for a list of top level installed modules of a project and their package.json files
 *
 * @param {string} path The path to the module, either absolute or relative to current working directory
 * @param {ListInstalledOptions} options
 * @returns {Promise<Map<string, NormalizedPackageJson>>}
 */
export async function listInstalled (path, options = {}) {
  if (typeof path !== 'string') throw new TypeError('Expected a string input to listInstalled()');
  if (typeof options !== 'object') throw new TypeError('Expected options to be an object for listInstalled()');

  /** @type {Map<string, NormalizedPackageJson>} */
  const pkgMap = new Map();

  for await (const { alias, pkg } of listInstalledGenerator(path, options)) {
    pkgMap.set(alias || pkg.name, pkg);
  }

  return pkgMap;
}

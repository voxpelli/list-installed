import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';

import { readPackage } from 'read-pkg';
import { bufferedAsyncMap } from 'buffered-async-iterable';

import { readdirModuleTree } from './fs.js';
import { looksLikeAnErrnoException, platformSpecificPath } from './utils.js';

/** @typedef {import('read-pkg').NormalizedPackageJson} NormalizedPackageJson */

export class MissingPathError extends Error {}

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
      throw new MissingPathError('Non-existing path set: ' + nodeModulesDir);
    }
    throw err;
  }

  yield * bufferedAsyncMap(readdirModuleTree(dir), async function * (relativeModulePath) {
    const cwd = pathModule.join(nodeModulesDir, platformSpecificPath(relativeModulePath));

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

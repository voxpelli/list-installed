import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';

import { bufferedAsyncMap } from 'buffered-async-iterable';

import { looksLikeAnErrnoException } from './utils.js';

export const PLATFORM_INDEPENDENT_SEPARATOR = '/';

/**
 * @param {string} moduleName
 * @returns {string}
 */
function platformIndependentRepresentation (moduleName) {
  return moduleName.replaceAll(pathModule.sep, PLATFORM_INDEPENDENT_SEPARATOR);
}

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

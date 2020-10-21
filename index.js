// @ts-check
/// <reference types="node" />

'use strict';

const { opendir } = require('fs').promises;
const pathModule = require('path');

const readPkg = require('read-pkg');

/**
 * @param {string|import('fs').Dir} cwd
 * @param {boolean} [skipScoped]
 * @param {string} [prefix]
 * @returns {AsyncGenerator<string>}
 */
const _internalReaddirScoped = async function * (cwd, skipScoped, prefix) {
  const dir = (
    typeof cwd === 'string'
      ? await opendir(cwd)
      : cwd
  );

  if (!dir || typeof dir !== 'object') throw new TypeError('Invalid input to readdirScoped()');

  for await (const file of dir) {
    if (!file.isDirectory()) continue;

    const moduleName = (prefix || '') + file.name;

    if (file.name.startsWith('@')) {
      if (!skipScoped) yield * _internalReaddirScoped(pathModule.join(dir.path, file.name), false, moduleName + '/');
    } else if (!file.name.startsWith('.')) {
      yield moduleName;
    }
  }
};

/**
 * @param {string|import('fs').Dir} cwd
 * @returns {AsyncGenerator<string>}
 */
const readdirScoped = async function * (cwd) {
  yield * _internalReaddirScoped(cwd);
};

/**
 * @param {import('fs').Dir} cwd
 * @param {number} [depth]
 * @param {string} [prefix]
 * @returns {AsyncGenerator<string>}
 */
const _internalReaddirModuleTree = async function * (cwd, depth = 0, prefix) {
  for await (const modulePath of _internalReaddirScoped(cwd, false, prefix)) {
    yield modulePath;

    if (depth < 1) continue;

    const subModule = pathModule.join(prefix || '', modulePath, 'node_modules');
    const subModulePath = pathModule.join(cwd.path, subModule);

    try {
      const dir = await opendir(subModulePath);
      yield * _internalReaddirModuleTree(dir, depth - 1, subModule + '/');
    } catch (err) {
      if (err.code === 'ENOENT' && err.path === subModulePath) {
        // Fail silently
      } else {
        throw err;
      }
    }
  }
};

/**
 * @param {string|import('fs').Dir} cwd
 * @param {number} [depth]
 * @returns {AsyncGenerator<string>}
 */
const readdirModuleTree = async function * (cwd, depth = 0) {
  const dir = (
    typeof cwd === 'string'
      ? await opendir(cwd)
      : cwd
  );

  if (!dir || typeof dir !== 'object') throw new TypeError('Invalid input to readdirModuleTree()');

  yield * _internalReaddirModuleTree(dir, depth);
};

/**
 * @param {string} cwd
 * @returns {AsyncGenerator<import('type-fest').PackageJson>}
 */
const listInstalledGenerator = async function * (cwd) {
  if (typeof cwd !== 'string') throw new TypeError('Expected a string input to listInstalledGenerator()');

  const nodeModulesDir = pathModule.resolve(cwd, 'node_modules');

  try {
    const dir = await opendir(nodeModulesDir);
    for await (const relativeModulePath of readdirModuleTree(dir)) {
      yield readPkg({ cwd: pathModule.join(nodeModulesDir, relativeModulePath) });
    }
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === nodeModulesDir) {
      throw new Error('Invalid path set to listInstalledGenerator: ' + nodeModulesDir);
    } else {
      throw err;
    }
  }
};

/**
 * @param {string} cwd
 * @returns {Promise<Map<string, import('type-fest').PackageJson>>}
 */
const listInstalled = async (cwd) => {
  if (typeof cwd !== 'string') throw new TypeError('Expected a string input to listInstalled()');

  /** @type {Map<string, import('type-fest').PackageJson>} */
  const pkgs = new Map();

  for await (const pkg of listInstalledGenerator(cwd)) {
    if (pkg.name) pkgs.set(pkg.name, pkg);
  }

  return pkgs;
};

module.exports = {
  readdirScoped,
  readdirModuleTree,
  listInstalledGenerator,
  listInstalled,
};

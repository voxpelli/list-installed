import mapWorkspaces from '@npmcli/map-workspaces';
import { findCauseByReference } from 'pony-cause';
import { readPackage } from 'read-pkg';

import { includeWorkspace } from './utils.js';
import { listInstalled, MissingPathError } from './list.js';

/**
 * @typedef LookupData
 * @property {string} cwd
 * @property {Record<string, import('./list.js').NormalizedPackageJson>} installed
 * @property {string} [workspace]
 * @property {import('read-pkg').NormalizedPackageJson} pkg
 */

/**
 * @throws {Error}
 * @param {string} [cwd]
 * @returns {Promise<LookupData>}
 */
export async function packageLookup (cwd = '.') {
  const [
    pkg,
    installed,
  ] = await Promise.all([
    readPackage({ cwd }).catch(/** @param {Error} err */ err => {
      throw new Error('Failed to read package.json', { cause: err });
    }),
    listInstalled(cwd).catch(/** @param {Error} err */ err => {
      if (findCauseByReference(err, MissingPathError)) {
        return;
      }
      throw new Error('Failed to list installed modules', { cause: err });
    }),
  ]);

  return {
    cwd,
    installed: Object.fromEntries(installed || []),
    pkg,
  };
}

/**
 * @typedef WorkspaceLookupOptions
 * @property {boolean|undefined} [includeWorkspaceRoot]
 * @property {string|undefined} [path]
 * @property {boolean|undefined} [skipWorkspaces]
 * @property {string[]|undefined} [workspace]
 */

/**
 * @throws {Error}
 * @param {WorkspaceLookupOptions} [options]
 * @returns {AsyncGenerator<LookupData>}
 */
export async function * workspaceLookup (options) {
  const {
    includeWorkspaceRoot = true,
    path: baseCwd = '.',
    skipWorkspaces = false,
    workspace,
  } = options || {};

  const main = await packageLookup(baseCwd);

  if (includeWorkspaceRoot) {
    yield main;
  }

  if (skipWorkspaces) {
    return;
  }

  const workspaceList = await mapWorkspaces({
    cwd: baseCwd,
    pkg: main.pkg,
  });

  /** @type {Set<string>} */
  const matchingWorkspaces = new Set();

  for (const [name, workspaceCwd] of workspaceList) {
    const workspaceMatch = workspace
      ? includeWorkspace(workspace, name, workspaceCwd, baseCwd)
      : true;

    if (!workspaceMatch) {
      continue;
    }

    if (workspaceMatch !== true) {
      matchingWorkspaces.add(workspaceMatch);
    }

    const { installed, ...data } = await packageLookup(workspaceCwd);

    yield {
      ...data,
      installed: { ...main.installed, ...installed },
      workspace: name,
    };
  }

  if (workspace && matchingWorkspaces.size !== (new Set(workspace)).size) {
    throw new Error(`Couldn't find all workspaces, missing: ${workspace.filter(value => !matchingWorkspaces.has(value)).join(', ')}`);
  }
}

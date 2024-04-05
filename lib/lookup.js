import { findCauseByReference } from 'pony-cause';
import { readWorkspaces } from 'read-workspaces';

import { listInstalled, MissingPathError } from './list.js';

/** @typedef {Record<string, import('./list.js').NormalizedPackageJson>} Installed */

/** @typedef {import('read-workspaces').Workspace & { installed: Installed }} LookupData */

/**
 * @param {string} cwd
 * @returns {Promise<Installed>}
 */
async function installedLookup (cwd) {
  const installed = await listInstalled(cwd).catch(/** @param {Error} err */ err => {
    if (findCauseByReference(err, MissingPathError)) {
      return;
    }
    throw new Error('Failed to list installed modules', { cause: err });
  });

  return Object.fromEntries(installed || []);
}

/**
 * @typedef WorkspaceLookupOptions
 * @property {string[]|undefined} [ignorePaths]
 * @property {boolean|undefined} [includeWorkspaceRoot]
 * @property {string|undefined} [path]
 * @property {boolean|undefined} [skipWorkspaces]
 * @property {string[]|undefined} [workspace]
 */

/**
 * @param {WorkspaceLookupOptions} [options]
 * @returns {AsyncGenerator<LookupData>}
 */
export async function * workspaceLookup (options) {
  const {
    includeWorkspaceRoot = true,
    path: cwd,
    ...restOptions
  } = options || {};

  /** @type {Installed|undefined} */
  let rootInstalled;

  for await (const data of readWorkspaces({
    ...restOptions,
    cwd,
    // We need to include the root here so that we get the installed
    includeWorkspaceRoot: true,
  })) {
    const installed = await installedLookup(data.cwd);

    // Keep the root installed for later
    if (!rootInstalled) {
      rootInstalled = installed;

      // But don't yield it if its not desired
      if (includeWorkspaceRoot === false) {
        continue;
      }
    }

    yield {
      ...data,
      installed: { ...rootInstalled, ...installed },
    };
  }
}

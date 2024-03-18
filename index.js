/** @typedef {import('./lib/list.js').FilterCallback} FilterCallback */
/** @typedef {import('./lib/list.js').ListInstalledOptions} ListInstalledOptions */
/** @typedef {import('./lib/list.js').NormalizedPackageJson} NormalizedPackageJson */

/** @typedef {import('./lib/lookup.js').LookupData} LookupData */
/** @typedef {import('./lib/lookup.js').WorkspaceLookupOptions} WorkspaceLookupOptions */

// Modern alternative to https://www.npmjs.com/package/readdir-scoped-modules
export { readdirModuleTree, readdirScoped } from './lib/fs.js';

// Modern alternative to https://www.npmjs.com/package/read-installed
export { listInstalled, listInstalledGenerator } from './lib/list.js';

// Helper for working with listInstalled in a mono-repo with workspaces
export { workspaceLookup } from './lib/lookup.js';

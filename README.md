# List Installed

A modern typed async alternative to [`read-installed`](https://www.npmjs.com/package/read-installed) and [`readdir-scoped-modules`](https://www.npmjs.com/package/readdir-scoped-modules). Used to list and return all modules installed in `node_modules`, either just their names or their `package.json` files.

[![npm version](https://img.shields.io/npm/v/list-installed.svg?style=flat)](https://www.npmjs.com/package/list-installed)
[![npm downloads](https://img.shields.io/npm/dm/list-installed.svg?style=flat)](https://www.npmjs.com/package/list-installed)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

### Simple

```bash
npm install list-installed
```

```javascript
import { listInstalled } from 'list-installed';

const pkgMap = await listInstalled(__dirname);

// Eg. iterate over the map
for (const [moduleName, pkg] of pkgMap.entries()) {
  // "moduleName" is identical to pkg.name
}
```

## Methods

### `readdirScoped(path)`

* **`path`**: A `string` pointing to the path of a _directory_, either absolute or relative to the current working directory. Eg: `./node_modules/`

**Returns:** `AsyncGenerator` that emits `string` of the name of each found directory

Similar functionality to `readdir()` from [`readdir-scoped-modules`](https://www.npmjs.com/package/readdir-scoped-modules).

Returns all directories in `path`, with the scoped directories (like `@foo`) expanded and joined with the directories directly beneath them (like eg. `@foo/abc` and `@foo/bar` if `abc` and `bar` are the two directories in `@foo`, though it will never expand to `@`- or `.`-prefixed subdirectories and will hence never return `@foo/@xyz` or `@foo/.bin`).

Will not return any directory with a name that begins with `.`.

### `readdirModuleTree(path, depth=0)`

* **`path`**: A `string` pointing to the path of a _directory_, either absolute or relative to the current working directory. Eg: * `./node_modules/`
* **`depth`**: If set to `0`, then this method is identical to `readdirScoped(path)`, else this will return also modules found this many layers deep

**Returns:** `AsyncGenerator` that emits `string` paths, relative to the provided `path`, for each found module

Works the same as `readdirScoped` with the addition that if `depth` is set to higher than `0`, then for every result of `readdirScoped` a `node_modules` subdirectory is looked for and if found, `readdirScoped` is run on that directory as well, prefixing all results with the parent name/prefix followed by `/node_modules/`.

For a two level deep tree the name returned would be like `foo/node_modules/bar/node_modules/xyz`, which one can do `.split('/node_modules/')` on to get in array shape.

### `listInstalled(path, [{ filter(pkg, alias) }])`

* **`path`**: A `string` pointing to the path of a _module_, either absolute or relative to the current working directory. Eg: `./* `
* **`filter`**: An optional callback that's similar to [`Array.prototype.filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter). Called with the resolved package file + if the module is aliased also the alias. Like `Array.prototype.filter()` it expects a truthy value back to include the item and a falsy to skip it. If the value returned is a `Promise` it will be resolved before the value is checked.

**Returns:** `Promise` that resolves to a `Map` that has `string` keys of the names of the found dependencies and values being the parsed `package.json` files.

Similar functionality to `readInstalled()` from [`read-installed`](https://www.npmjs.com/package/read-installed).

Returns all top level dependencies found installed for a module.

Parses all `package.json` in parallell using [`read-pkg`](https://github.com/sindresorhus/read-pkg) with results corresponding to the [`read-pkg`](https://github.com/sindresorhus/read-pkg) [`NormalizedPackageJson`](https://github.com/sindresorhus/read-pkg/blob/f50f5ffd4d5d25ef3387562c2e32e22ba68552dd/index.d.ts#L24) type.

### `listInstalledGenerator(path, [{ filter }])`

* **`path`**: A `string` pointing to the path of a _module_, either absolute or relative to the current working directory. Eg: `./* `
* **`filter`**: An optional callback that's similar to [`Array.prototype.filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter). Called with the resolved package file + if the module is aliased also the alias. Like `Array.prototype.filter()` it expects a truthy value back to include the item and a falsy to skip it. If the value returned is a `Promise` it will be resolved before the value is checked.

**Returns:** `AsyncGenerator` that emits an object for each of the found dependencies. The object has two properties: `alias`, containing the alias when the module has been installed under an alias, and `pkg`, containing the parsed `package.json` files of the found dependencies.

Same as `listInstalled(path)`, but rather than parsing `package.json` in parallell, it parses it sequentially at the pace that it is consumed.

### `workspaceLookup([options])`

* **`options.ignorePaths`**: An array of strings, `string[]`, with paths to ignore during the lookup of workspaces
* **`options.includeWorkspaceRoot=true`**: If set to `false`, then the workspace root will not be returned
* **`options.path='.'`**: A `string` pointing to the path of the module to look up the `package.json` and installed modules for
* **`options.skipWorkspaces=false`**: If set, then no workspace lookup will be done and no workspaces be returned
* **`options.workspace`**: An array of strings that should match the name of a workspace, its path or its path prefix. Only matching workspaces will be returned (as well as the root if `includeWorkspaceRoot` is `true`). If a workspace can't be found, then an error will be thrown when the generator has been fully iterated through.
* ...and any other option available in [`read-workspaces`](https://github.com/voxpelli/read-workspaces?tab=readme-ov-file#readworkspacesoptions)

**Returns:** `AsyncGenerator` that emits `{ cwd, installed, pkg, workspace }` for the root (if `includeWorkspaceRoot` is `true`) and each matching workspace (if `skipWorkspaces` isn't `true`). `cwd` is the path to the workspace or root, `installed` is an object that's the combined result of a `listInstalled` for the root and that `cwd`, `pkg` is the `package.json` of the workspace or root and `workspace` is the name of the workspace and is not set on the root result.

## Used by

* [`installed-check`](https://github.com/voxpelli/node-installed-check) / [`installed-check-core`](https://github.com/voxpelli/node-installed-check-core)

## Similar modules

* [`list-dependents`](https://github.com/voxpelli/list-dependents) – looks up the the modules depending on a provided module them and returns them in a similar way to this module
* [`read-workspaces`](https://github.com/voxpelli/read-workspaces) – provides the workspace lookup functionality that this module uses

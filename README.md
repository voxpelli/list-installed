# List Installed

A modern typed async alternative to [`read-installed`](https://www.npmjs.com/package/read-installed) and [`readdir-scoped-modules`](https://www.npmjs.com/package/readdir-scoped-modules). Used to list and return all modules installed in `node_modules`, either just their names or their `package.json` files.

[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat)](https://github.com/standard/semistandard)

## Usage

### Simple

```bash
yarn add list-installed
```

```javascript
const { listInstalled } = require('list-installed');

listInstalled(__dirname).then(pkgMap => {
  // Eg. iterate over the map
  for (const [moduleName, pkg] of pkgMap.entries()) {
    // "moduleName" is identical to pkg.name
  }
});
```

## Methods

### `readdirScoped(path)`

**`path`**: A `string` pointing to the path of a _directory_, either absolute or relative to the current working directory. Eg: `./node_modules/`

**Returns:** `AsyncGenerator` that emits `string`:s of the name of each found directory

Similar functionality to `readdir()` from [`readdir-scoped-modules`](https://www.npmjs.com/package/readdir-scoped-modules).

Returns all directories in `path`, with all scoped directories (like `@foo`) being expanded and joined with the directories directly within them (like eg. `@foo/abc` and `@foo/bar` if `abc` and `bar` are the two directories in `@foo`, though would never return `@foo/@xyz` or `@foo/.bin`).

Will not return any folder name that begins with `.`.

### `readdirModuleTree(path, depth=0)`

**`path`**: A `string` pointing to the path of a _directory_, either absolute or relative to the current working directory. Eg: `./node_modules/`
**`depth`**: If set to `0`, then this method is identical to `readdirScoped(path)`, else this will return also modules found this many layers deep

**Returns:** `AsyncGenerator` that emits `string`:s the path to each found module, relative to the provided `path`

Works the same as `readdirScoped` with the addition that if `depth` is set to higher than `0`, then for every result of `readdirScoped` a `node_modules` subdirectory is looked for and if found, `readdirScoped` is run on that directory as well, prefixing all results with the parent name/prefix followed by `/node_modules/`.

For a two level deep tree the name returned would be like `foo/node_modules/bar/node_modules/xyz`, which one can do `.split('/node_modules/')` on to get in array shape.

### `listInstalled(path)`

**`path`**: A `string` pointing to the path of a _module_, either absolute or relative to the current working directory. Eg: `./`

**Returns:** `Promise` that resolves to a `Map` that has `string` keys of the names of the found dependencies and values being the parsed `package.json` files.

Similar functionality to `readInstalled()` from [`read-installed`](https://www.npmjs.com/package/read-installed).

Returns all top level dependencies found installed for a module.

Parses all `package.json` in parallell using [`read-pkg`](https://github.com/sindresorhus/read-pkg) with results corresponding to the [`type-fest`](https://github.com/sindresorhus/type-fest) [`PackageJson`](https://github.com/sindresorhus/type-fest/blob/master/source/package-json.d.ts) type.

### `listInstalledGenerator(path)`

**`path`**: A `string` pointing to the path of a _module_, either absolute or relative to the current working directory. Eg: `./`

**Returns:** `AsyncGenerator` that emits the parsed `package.json` files of the found dependencies.

Same as `listInstalled(path)`, but rather than parsing `package.json` in parallell, it parses it sequentially at the pace that it is consumed.

import { platformSpecificPath } from '../../lib/utils.js';

const installedInterconnected = () => ({
  '@voxpelli/workspace-a': {
    '_id': '@voxpelli/workspace-a@',
    dependencies: {
      '@voxpelli/workspace-z': '*',
      abc: '^1.0.0',
      bar: '^2.0.0',
      foo: '^1.0.0',
    },
    'engines': {
      'node': '>=8.0.0',
    },
    'name': '@voxpelli/workspace-a',
    'private': true,
    'readme': 'ERROR: No README data found!',
    'version': '',
  },
  '@voxpelli/workspace-z': {
    '_id': '@voxpelli/workspace-z@',
    'engines': {
      'node': '>=8.0.0',
    },
    'name': '@voxpelli/workspace-z',
    'private': true,
    'readme': 'ERROR: No README data found!',
    'version': '',
  },
});

export const pkgResult = (/** @type {string} */ cwd, /** @type {boolean} */ interconnected = false) => ({
  cwd,
  pkg: {
    _id: '@',
    engines: { node: '>=8.0.0' },
    dependencies: {
      bar: '^1.0.0',
      foo: '^1.0.0',
    },
    name: '',
    readme: 'ERROR: No README data found!',
    version: '',
    workspaces: ['packages/*'],
  },
  installed: {
    ...interconnected && installedInterconnected(),
    bar: {
      '_id': 'bar@1.0.0',
      'engines': {
        'node': '>=8.0.0',
      },
      'name': 'bar',
      'private': true,
      'readme': 'ERROR: No README data found!',
      'version': '1.0.0',
    },
    foo: {
      '_id': 'foo@1.0.0',
      'engines': {
        'node': '>=8.0.0',
      },
      'name': 'foo',
      'private': true,
      'readme': 'ERROR: No README data found!',
      'version': '1.0.0',
    },
  },
});

export const workspaceAResult = (/** @type {string} */ cwd, /** @type {boolean} */ interconnected = false) => ({
  cwd: cwd + platformSpecificPath('/packages/a'),
  workspace: '@voxpelli/workspace-a',
  pkg: {
    _id: '@voxpelli/workspace-a@',
    engines: { node: '>=8.0.0' },
    dependencies: {
      ...interconnected ? { '@voxpelli/workspace-z': '*' } : {},
      abc: '^1.0.0',
      bar: '^2.0.0',
      foo: '^1.0.0',
    },
    name: '@voxpelli/workspace-a',
    'private': true,
    readme: 'ERROR: No README data found!',
    version: '',
  },
  installed: {
    ...interconnected && installedInterconnected(),
    abc: {
      '_id': 'abc@1.0.0',
      'engines': {
        'node': '>=8.0.0',
      },
      'name': 'abc',
      'private': true,
      'readme': 'ERROR: No README data found!',
      'version': '1.0.0',
    },
    bar: {
      '_id': 'bar@2.0.0',
      'engines': {
        'node': '>=8.0.0',
      },
      'name': 'bar',
      'private': true,
      'readme': 'ERROR: No README data found!',
      'version': '2.0.0',
    },
    foo: {
      '_id': 'foo@1.0.0',
      'engines': {
        'node': '>=8.0.0',
      },
      'name': 'foo',
      'private': true,
      'readme': 'ERROR: No README data found!',
      'version': '1.0.0',
    },
  },
});

export const workspaceZResult = (/** @type {string} */ cwd, /** @type {boolean} */ interconnected = false) => ({
  cwd: cwd + platformSpecificPath('/packages/z'),
  workspace: '@voxpelli/workspace-z',
  pkg: {
    _id: '@voxpelli/workspace-z@',
    engines: { node: '>=8.0.0' },
    name: '@voxpelli/workspace-z',
    'private': true,
    readme: 'ERROR: No README data found!',
    version: '',
  },
  installed: pkgResult(cwd, interconnected).installed,
});

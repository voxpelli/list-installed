import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { workspaceLookup } from '../lib/lookup.js';
import { pkgResult, workspaceAResult, workspaceZResult } from './fixtures/lookup.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('workspaceLookup', () => {
  it('should return data', async () => {
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup()) {
      data.push(item);
    }

    assert.equal(data.length, 1);

    for (const item of data) {
      assert.equal(typeof item, 'object');
      assert.deepStrictEqual(Object.keys(item).toSorted(), ['cwd', 'installed', 'pkg']);
      assert.equal(item.pkg.name, 'list-installed');
    }
  });

  it('should return data from cwd when specified', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd })) {
      data.push(item);
    }

    assert.equal(data.length, 3);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
      workspaceZResult(cwd),
    ]);
  });

  it('should ignore empty workspace filter', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, workspace: [] })) {
      data.push(item);
    }

    assert.equal(data.length, 3);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
      workspaceZResult(cwd),
    ]);
  });

  it('should include workspaces when requested by name', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, workspace: ['@voxpelli/workspace-a'] })) {
      data.push(item);
    }

    assert.equal(data.length, 2);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
    ]);
  });

  it('should include workspaces when requested by exact absolute path', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, workspace: [`${cwd}/packages/a`] })) {
      data.push(item);
    }

    assert.equal(data.length, 2);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
    ]);
  });

  it('should include workspaces when requested by exact relative path', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, workspace: ['packages/a'] })) {
      data.push(item);
    }

    assert.equal(data.length, 2);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
    ]);
  });

  it('should include workspaces when requested by path prefix', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, workspace: [`${cwd}/packages`] })) {
      data.push(item);
    }

    assert.equal(data.length, 3);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
      workspaceZResult(cwd),
    ]);
  });

  it('should throw at end of iteration if a requested workspace is missing', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    await assert.rejects(async () => {
      for await (const item of workspaceLookup({ path: cwd, workspace: ['packages/a', 'packages/b'] })) {
        data.push(item);
      }
    }, {
      message: 'Couldn\'t find all workspaces, missing: packages/b',
    });

    assert.equal(data.length, 2);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
      workspaceAResult(cwd),
    ]);
  });

  it('should respect "skipWorkspaces"', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, skipWorkspaces: true })) {
      data.push(item);
    }

    assert.equal(data.length, 1);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
    ]);
  });

  it('should have "skipWorkspaces" skip workspaces even when workspaces are specifically sent in', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, skipWorkspaces: true, workspace: ['@voxpelli/workspace-a'] })) {
      data.push(item);
    }

    assert.equal(data.length, 1);
    assert.deepStrictEqual(data, [
      pkgResult(cwd),
    ]);
  });

  it('should respect "includeWorkspaceRoot"', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, includeWorkspaceRoot: false })) {
      data.push(item);
    }

    assert.equal(data.length, 2);
    assert.deepStrictEqual(data, [
      workspaceAResult(cwd),
      workspaceZResult(cwd),
    ]);
  });

  it('should respect both "includeWorkspaceRoot" and "skipWorkspaces" at once', async () => {
    const cwd = path.join(here, 'fixtures/workspace');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd, includeWorkspaceRoot: false, skipWorkspaces: true })) {
      data.push(item);
    }

    assert.equal(data.length, 0);
    assert.deepStrictEqual(data, []);
  });

  it('should include references to other workspaces', async () => {
    const cwd = path.join(here, 'fixtures/workspace-interconnected');
    /** @type {Array<import('../lib/lookup.js').LookupData>} */
    const data = [];

    for await (const item of workspaceLookup({ path: cwd })) {
      data.push(item);
    }

    assert.equal(data.length, 3);
    assert.deepStrictEqual(data, [
      pkgResult(cwd, true),
      workspaceAResult(cwd, true),
      workspaceZResult(cwd, true),
    ]);
  });
});

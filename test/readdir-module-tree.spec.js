import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  readdirModuleTree,
} from '../lib/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('readdirModuleTree()', () => {
  it('should throw on invalid input', async () => {
    // @ts-ignore
    const iterator = readdirModuleTree();
    await assert.rejects(iterator.next(), {
      name: 'TypeError',
      message: 'Invalid input to readdirModuleTree()',
    });
  });

  it('should return an async iterator', () => {
    const result = readdirModuleTree('foo');
    assert.ok(result);
    assert.equal(typeof result, 'object');
    assert.ok(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const moduleName of readdirModuleTree(path.join(here, '../node_modules'))) {
      assert.ok(moduleName);
      assert.equal(typeof moduleName, 'string');
      assert.doesNotMatch(moduleName, /^\./);

      if (moduleName.startsWith('@')) {
        assert.match(moduleName, /^@[\w\-.]+\/[\w\-.]+$/);
      } else {
        assert.ok(!moduleName.includes('@') && !moduleName.includes('/'));
      }
    }
  });

  it('should find nested modules', async () => {
    for await (const moduleName of readdirModuleTree(path.join(here, '../node_modules'), 10)) {
      assert.ok(moduleName);
      assert.equal(typeof moduleName, 'string');
      assert.doesNotMatch(moduleName, /^\./);

      if (moduleName.startsWith('@')) assert.match(moduleName, /^@[\w\-.]+\/[\w\-.]/);
      if (moduleName.includes('/node_modules/')) {
        assert.match(moduleName, /^(?:@[\w\-.]+\/)?[\w\-.]+(?:\/node_modules\/(?:@[\w\-.]+\/)?[\w\-.]+)*$/);
      }
    }
  });

  it('should follow symlinks', async () => {
    const cwd = path.join(here, 'fixtures/workspace-interconnected/node_modules');

    /** @type {string[]} */
    const data = [];

    for await (const moduleName of readdirModuleTree(cwd)) {
      data.push(moduleName);
    }

    assert.deepStrictEqual(data.toSorted(), ['@voxpelli/workspace-a', '@voxpelli/workspace-z', 'bar', 'foo']);
  });
});

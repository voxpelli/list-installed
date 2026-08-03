import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  readdirScoped,
} from '../lib/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('readdirScoped()', () => {
  it('should throw on invalid input', async () => {
    // @ts-ignore
    const iterator = readdirScoped();
    await assert.rejects(iterator.next(), {
      name: 'TypeError',
      message: 'Invalid input to readdirScoped()',
    });
  });

  it('should return an async iterator', () => {
    const result = readdirScoped('foo');
    assert.ok(result);
    assert.equal(typeof result, 'object');
    assert.ok(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const moduleName of readdirScoped(path.join(here, '../node_modules'))) {
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
});

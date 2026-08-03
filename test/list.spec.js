import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  listInstalled,
} from '../lib/list.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const aliasedPkg = () => ({
  _id: 'bar@1.0.0',
  name: 'bar',
  readme: 'ERROR: No README data found!',
  version: '1.0.0',
});

describe('listInstalled()', { timeout: 30000 }, () => {
  it('should throw on invalid input', async () => {
    // @ts-ignore
    await assert.rejects(listInstalled(), {
      name: 'TypeError',
      message: 'Expected a string input to listInstalled()',
    });
  });

  it('should throw on non-existing path', async () => {
    await assert.rejects(listInstalled(path.join(here, 'non-existing-path')), {
      message: /^Non-existing path set: /,
    });
  });

  it('should return a promise', () => {
    const result = listInstalled(path.join(here, '..'));
    assert.ok(result instanceof Promise);
  });

  it('should resolve to sensible values', async () => {
    const result = await listInstalled(path.join(here, '..'));
    assert.ok(result instanceof Map);

    for (const [moduleName, pkg] of result.entries()) {
      assert.ok(moduleName);
      assert.ok(pkg);

      assert.equal(typeof moduleName, 'string');
      assert.equal(typeof pkg, 'object');
      assert.equal(typeof pkg.name, 'string');

      if (moduleName.startsWith('@')) {
        assert.match(moduleName, /^@[\w\-.]+\/[\w\-.]+$/);
      } else {
        assert.ok(!moduleName.includes('@') && !moduleName.includes('/'));
      }
    }
  });

  it('should handle aliased packages', async () => {
    const result = await listInstalled(path.join(here, 'fixtures/containing_aliased_package'));

    assert.ok(result instanceof Map);

    /** @type {Array<[string, import('../lib/list.js').NormalizedPackageJson]>} */
    const expected = [
      ['@voxpelli/bar', aliasedPkg()],
      ['bar', aliasedPkg()],
      ['bar-foo', aliasedPkg()],
    ];

    assert.deepStrictEqual(
      [...result.entries()].toSorted(([a], [b]) => a.localeCompare(b)),
      expected.toSorted(([a], [b]) => a.localeCompare(b))
    );
  });

  it('should apply filters', async (t) => {
    const filter = t.mock.fn(/** @type {import('../lib/list.js').FilterCallback} */ (pkg, alias) => {
      if (alias === 'bar-foo') return false;
      if (pkg.name === 'bar' && alias === undefined) return Promise.resolve(false);
      return true;
    });

    const result = await listInstalled(path.join(here, 'fixtures/containing_aliased_package'), { filter });

    assert.ok(result instanceof Map);

    assert.equal(filter.mock.callCount(), 3);

    /** @type {Array<[unknown, unknown]>} */
    const expectedCalls = [
      [aliasedPkg(), '@voxpelli/bar'],
      [aliasedPkg(), 'bar-foo'],
      [aliasedPkg(), undefined],
    ];

    assert.deepStrictEqual(
      filter.mock.calls.map(call => call.arguments).toSorted((a, b) => String(a[1]).localeCompare(String(b[1]))),
      expectedCalls.toSorted((a, b) => String(a[1]).localeCompare(String(b[1])))
    );

    assert.deepStrictEqual(
      [...result.entries()].toSorted(([a], [b]) => a.localeCompare(b)),
      [['@voxpelli/bar', aliasedPkg()]]
    );
  });
});

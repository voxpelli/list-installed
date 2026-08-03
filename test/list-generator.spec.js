import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  listInstalledGenerator,
} from '../lib/list.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const aliasedPkg = () => ({
  _id: 'bar@1.0.0',
  name: 'bar',
  readme: 'ERROR: No README data found!',
  version: '1.0.0',
});

describe('listInstalledGenerator()', { timeout: 30000 }, () => {
  it('should throw on invalid input', async () => {
    // @ts-ignore
    const iterator = listInstalledGenerator();
    await assert.rejects(iterator.next(), {
      name: 'TypeError',
      message: 'Expected a string input to listInstalledGenerator()',
    });
  });

  it('should throw on non-existing path', async () => {
    const iterator = listInstalledGenerator(path.join(here, 'non-existing-path'));
    await assert.rejects(iterator.next(), {
      message: /^Non-existing path set: /,
    });
  });

  it('should return an async iterator', () => {
    const result = listInstalledGenerator('foo');
    assert.ok(result);
    assert.equal(typeof result, 'object');
    assert.ok(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const { pkg } of listInstalledGenerator(path.join(here, '..'))) {
      assert.ok(pkg);

      assert.equal(typeof pkg, 'object');
      assert.equal(typeof pkg.name, 'string');

      if (pkg.name.startsWith('@')) {
        assert.match(pkg.name, /^@[\w\-.]+\/[\w\-.]+$/);
      } else {
        assert.ok(!pkg.name.includes('@') && !pkg.name.includes('/'));
      }
    }
  });

  it('should ignore package.json less folders in node_modules', async () => {
    /** @type {import('read-pkg').NormalizedPackageJson[]} */
    const packages = [];

    for await (const { pkg } of listInstalledGenerator(path.join(here, 'fixtures/containing_non_package'))) {
      packages.push(pkg);
    }

    assert.deepStrictEqual(packages, [
      {
        _id: 'bar@1.0.0',
        name: 'bar',
        readme: 'ERROR: No README data found!',
        version: '1.0.0',
      },
    ]);
  });

  it('should ignore malformed package.json in node_modules', async () => {
    /** @type {import('read-pkg').NormalizedPackageJson[]} */
    const packages = [];

    for await (const { pkg } of listInstalledGenerator(path.join(here, 'fixtures/containing_malformed_package'))) {
      packages.push(pkg);
    }

    assert.deepStrictEqual(packages, [
      {
        _id: 'bar@1.0.0',
        name: 'bar',
        readme: 'ERROR: No README data found!',
        version: '1.0.0',
      },
    ]);
  });

  it('should handle aliased packages', async () => {
    /** @type {Array<{ alias: string|undefined, pkg: import('read-pkg').NormalizedPackageJson }>} */
    const packages = [];

    for await (const item of listInstalledGenerator(path.join(here, 'fixtures/containing_aliased_package'))) {
      packages.push(item);
    }

    /** @type {Array<{ alias: string|undefined, pkg: import('read-pkg').NormalizedPackageJson }>} */
    const expected = [
      { pkg: aliasedPkg(), alias: '@voxpelli/bar' },
      { pkg: aliasedPkg(), alias: 'bar-foo' },
      { pkg: aliasedPkg(), alias: undefined },
    ];

    assert.deepStrictEqual(
      packages.toSorted((a, b) => String(a.alias).localeCompare(String(b.alias))),
      expected.toSorted((a, b) => String(a.alias).localeCompare(String(b.alias)))
    );
  });

  it('should apply filters', async (t) => {
    const filter = t.mock.fn(/** @type {import('../lib/list.js').FilterCallback} */ (pkg, alias) => {
      if (alias === 'bar-foo') return false;
      if (pkg.name === 'bar' && alias === undefined) return Promise.resolve(false);
      return true;
    });

    /** @type {Array<{ alias: string|undefined, pkg: import('read-pkg').NormalizedPackageJson }>} */
    const packages = [];

    for await (const item of listInstalledGenerator(path.join(here, 'fixtures/containing_aliased_package'), { filter })) {
      packages.push(item);
    }

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
      packages.toSorted((a, b) => String(a.alias).localeCompare(String(b.alias))),
      [
        { pkg: aliasedPkg(), alias: '@voxpelli/bar' },
      ]
    );
  });
});

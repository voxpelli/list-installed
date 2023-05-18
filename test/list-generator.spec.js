import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'desm';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  listInstalledGenerator,
} from '../index.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should = chai.should();

const aliasedPkg = () => ({
  _id: 'bar@1.0.0',
  name: 'bar',
  readme: 'ERROR: No README data found!',
  version: '1.0.0',
});

describe('listInstalledGenerator()', function () {
  this.timeout(5000);

  it('should throw on invalid input', async () => {
    await (async () => {
      // @ts-ignore
      // eslint-disable-next-line no-unused-vars, no-empty
      for await (const _foo of listInstalledGenerator()) {}
    })()
      .should.be.rejectedWith(TypeError, 'Expected a string input to listInstalledGenerator()');
  });

  it('should throw on non-existing path', async () => {
    await (async () => {
      // @ts-ignore
      // eslint-disable-next-line no-unused-vars, no-empty
      for await (const _foo of listInstalledGenerator(join(import.meta.url, 'non-existing-path'))) {}
    })()
      .should.be.rejectedWith(Error, /^Non-existing path set: /);
  });

  it('should return an async iterator', async () => {
    const result = listInstalledGenerator('foo');
    should.exist(result);
    (typeof result === 'object').should.be.ok;
    should.exist(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const { pkg } of listInstalledGenerator(join(import.meta.url, '..'))) {
      should.exist(pkg);

      pkg.should.be.an('object').with.property('name').that.is.a('string');

      if (!pkg.name) {
        throw new Error('Should not have been returned');
      } else if (pkg.name.startsWith('@')) {
        pkg.name.should.match(/^@[\w-.]+\/[\w-.]+$/);
      } else {
        pkg.name.should.not.include('@').and.not.include('/');
      }
    }
  });

  it('should ignore package.json less folders in node_modules', async () => {
    /** @type {import('read-pkg').NormalizedPackageJson[]} */
    const packages = [];

    for await (const { pkg } of listInstalledGenerator(join(import.meta.url, './fixtures/containing_non_package/'))) {
      packages.push(pkg);
    }

    packages.should.deep.equal([
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

    for await (const { pkg } of listInstalledGenerator(join(import.meta.url, './fixtures/containing_malformed_package/'))) {
      packages.push(pkg);
    }

    packages.should.deep.equal([
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

    for await (const item of listInstalledGenerator(join(import.meta.url, './fixtures/containing_aliased_package/'))) {
      packages.push(item);
    }

    packages.should.have.deep.members([
      { pkg: aliasedPkg(), alias: '@voxpelli/bar' },
      { pkg: aliasedPkg(), alias: 'bar-foo' },
      { pkg: aliasedPkg(), alias: undefined },
    ]);
  });

  it('should apply filters', async () => {
    const filter = sinon.stub()
      .callsFake(/** @type {import('../index.js').FilterCallback} */ (pkg, alias) => {
        if (alias === 'bar-foo') return false;
        if (pkg.name === 'bar' && alias === undefined) return Promise.resolve(false);
        return true;
      });

    /** @type {Array<{ alias: string|undefined, pkg: import('read-pkg').NormalizedPackageJson }>} */
    const packages = [];

    for await (const item of listInstalledGenerator(join(import.meta.url, './fixtures/containing_aliased_package/'), { filter })) {
      packages.push(item);
    }

    filter.should.have.been.calledThrice
      .and.calledWithExactly(aliasedPkg(), '@voxpelli/bar')
      .and.calledWithExactly(aliasedPkg(), 'bar-foo')
      // eslint-disable-next-line unicorn/no-useless-undefined
      .and.calledWithExactly(aliasedPkg(), undefined);

    packages.should.have.deep.members([
      { pkg: aliasedPkg(), alias: '@voxpelli/bar' },
    ]);
  });
});

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'desm';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  listInstalled,
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

describe('listInstalled()', function () {
  this.timeout(5000);

  it('should throw on invalid input', async () => {
    // @ts-ignore
    await listInstalled()
      .should.be.rejectedWith(TypeError, 'Expected a string input to listInstalled()');
  });

  it('should throw on non-existing path', async () => {
    // @ts-ignore
    await listInstalled(join(import.meta.url, 'non-existing-path'))
      .should.be.rejectedWith(Error, /^Non-existing path set: /);
  });

  it('should return a promise', async () => {
    const result = listInstalled(join(import.meta.url, '..'));
    should.exist(result);
    result.should.be.an.instanceOf(Promise);
  });

  it('should resolve to sensible values', async () => {
    const result = await listInstalled(join(import.meta.url, '..'));
    should.exist(result);
    result.should.be.an.instanceOf(Map);

    for (const [moduleName, pkg] of result.entries()) {
      should.exist(moduleName);
      should.exist(pkg);

      moduleName.should.be.a('string');
      pkg.should.be.an('object').with.property('name').that.is.a('string');

      if (moduleName.startsWith('@')) {
        moduleName.should.match(/^@[\w-.]+\/[\w-.]+$/);
      } else {
        moduleName.should.not.include('@').and.not.include('/');
      }
    }
  });

  it('should handle aliased packages', async () => {
    const result = await listInstalled(join(import.meta.url, './fixtures/containing_aliased_package/'));

    should.exist(result);
    result.should.be.an.instanceOf(Map);

    [...result.entries()].should.have.deep.members([
      ['@voxpelli/bar', aliasedPkg()],
      ['bar-foo', aliasedPkg()],
      ['bar', aliasedPkg()],
    ]);
  });

  it('should apply filters', async () => {
    const filter = sinon.stub()
      .callsFake(/** @type {import('../index.js').FilterCallback} */ (pkg, alias) => {
        if (alias === 'bar-foo') return false;
        if (pkg.name === 'bar' && alias === undefined) return Promise.resolve(false);
        return true;
      });

    const result = await listInstalled(join(import.meta.url, './fixtures/containing_aliased_package/'), { filter });

    should.exist(result);
    result.should.be.an.instanceOf(Map);

    filter.should.have.been.calledThrice
      .and.calledWithExactly(aliasedPkg(), '@voxpelli/bar')
      .and.calledWithExactly(aliasedPkg(), 'bar-foo')
      // eslint-disable-next-line unicorn/no-useless-undefined
      .and.calledWithExactly(aliasedPkg(), undefined);

    [...result.entries()].should.have.length(1).with.deep.members([
      ['@voxpelli/bar', aliasedPkg()],
    ]);
  });
});

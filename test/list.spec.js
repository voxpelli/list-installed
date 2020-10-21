/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const pathModule = require('path');

chai.use(chaiAsPromised);
const should = chai.should();

const {
  listInstalled,
} = require('..');

describe('listInstalled()', () => {
  it('should throw on invalid input', async () => {
    // @ts-ignore
    await listInstalled()
      .should.be.rejectedWith(TypeError, 'Expected a string input to listInstalled()');
  });

  it('should return a promise', async () => {
    const result = listInstalled(pathModule.join(__dirname, '..'));
    should.exist(result);
    result.should.be.an.instanceOf(Promise);
  });

  it('should resolve to sensible values', async () => {
    const result = await listInstalled(pathModule.join(__dirname, '..'));
    should.exist(result);
    result.should.be.an.instanceOf(Map);

    for (const [moduleName, pkg] of result.entries()) {
      should.exist(moduleName);
      should.exist(pkg);

      moduleName.should.be.a('string');
      pkg.should.be.an('object').with.property('name', moduleName);

      if (moduleName.startsWith('@')) {
        moduleName.should.match(/^@[\w-.]+\/[\w-.]+$/);
      } else {
        moduleName.should.not.include('@').and.not.include('/');
      }
    }
  });
});

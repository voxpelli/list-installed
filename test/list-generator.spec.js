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
  listInstalledGenerator,
} = require('..');

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
      for await (const _foo of listInstalledGenerator(pathModule.join(__dirname, 'non-existing-path'))) {}
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
    for await (const pkg of listInstalledGenerator(pathModule.join(__dirname, '..'))) {
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
    const packages = [];

    for await (const pkg of listInstalledGenerator(pathModule.join(__dirname, './fixtures/containing_non_package/'))) {
      packages.push(pkg);
    }

    packages.should.deep.equal([
      {
        _id: 'bar@1.0.0',
        name: 'bar',
        readme: 'ERROR: No README data found!',
        version: '1.0.0'
      }
    ]);
  });

  it('should ignore malformed package.json in node_modules', async () => {
    const packages = [];

    for await (const pkg of listInstalledGenerator(pathModule.join(__dirname, './fixtures/containing_malformed_package/'))) {
      packages.push(pkg);
    }

    packages.should.deep.equal([
      {
        _id: 'bar@1.0.0',
        name: 'bar',
        readme: 'ERROR: No README data found!',
        version: '1.0.0'
      }
    ]);
  });
});

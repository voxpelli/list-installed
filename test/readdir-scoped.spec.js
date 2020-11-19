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
  readdirScoped,
} = require('..');

describe('readdirScoped()', () => {
  it('should throw on invalid input', async () => {
    await (async () => {
      // @ts-ignore
      // eslint-disable-next-line no-unused-vars, no-empty
      for await (const _foo of readdirScoped()) {}
    })()
      .should.be.rejectedWith(TypeError, 'Invalid input to readdirScoped()');
  });

  it('should return an async iterator', async () => {
    const result = readdirScoped('foo');
    should.exist(result);
    (typeof result === 'object').should.be.ok;
    should.exist(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const moduleName of readdirScoped(pathModule.join(__dirname, '../node_modules'))) {
      should.exist(moduleName);
      moduleName.should.be.a('string').and.not.match(/^\./);

      if (moduleName.startsWith('@')) {
        moduleName.should.match(/^@[\w-.]+\/[\w-.]+$/);
      } else {
        moduleName.should.not.include('@').and.not.include('/');
      }
    }
  });
});

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
  readdirModuleTree,
} = require('..');

describe('readdirModuleTree()', () => {
  it('should throw on invalid input', async () => {
    await (async () => {
      // @ts-ignore
      // eslint-disable-next-line no-unused-vars, no-empty
      for await (const _foo of readdirModuleTree()) {}
    })()
      .should.be.rejectedWith(TypeError, 'Invalid input to readdirModuleTree()');
  });

  it('should return an async iterator', async () => {
    const result = readdirModuleTree('foo');
    should.exist(result);
    (typeof result === 'object').should.be.ok;
    should.exist(result[Symbol.asyncIterator]);
  });

  it('should return sensible values', async () => {
    for await (const moduleName of readdirModuleTree(pathModule.join(__dirname, '../node_modules'))) {
      should.exist(moduleName);
      moduleName.should.be.a('string').and.not.match(/^\./);

      if (moduleName.startsWith('@')) {
        moduleName.should.match(/^@[\w-.]+\/[\w-.]+$/);
      } else {
        moduleName.should.not.include('@').and.not.include('/');
      }
    }
  });

  it('should find nested modules', async () => {
    for await (const moduleName of readdirModuleTree(pathModule.join(__dirname, '../node_modules'), 10)) {
      should.exist(moduleName);
      moduleName.should.be.a('string').and.not.match(/^\./);

      if (moduleName.startsWith('@')) moduleName.should.match(/^@[\w-.]+\/[\w-.]/);
      if (moduleName.includes('/node_modules/')) {
        moduleName.should.match(/^(?:@[\w-.]+\/)?[\w-.]+(?:\/node_modules\/(?:@[\w-.]+\/)?[\w-.]+)*$/);
      }
    }
  });
});

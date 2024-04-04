import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'desm';

import {
  readdirModuleTree,
} from '../lib/fs.js';

chai.use(chaiAsPromised);
const should = chai.should();

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
    for await (const moduleName of readdirModuleTree(join(import.meta.url, '../node_modules'))) {
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
    for await (const moduleName of readdirModuleTree(join(import.meta.url, '../node_modules'), 10)) {
      should.exist(moduleName);
      moduleName.should.be.a('string').and.not.match(/^\./);

      if (moduleName.startsWith('@')) moduleName.should.match(/^@[\w-.]+\/[\w-.]/);
      if (moduleName.includes('/node_modules/')) {
        moduleName.should.match(/^(?:@[\w-.]+\/)?[\w-.]+(?:\/node_modules\/(?:@[\w-.]+\/)?[\w-.]+)*$/);
      }
    }
  });

  it('should follow symlinks', async () => {
    const cwd = join(import.meta.url, 'fixtures/workspace-interconnected/node_modules');

    /** @type {string[]} */
    const data = [];

    for await (const moduleName of readdirModuleTree(cwd)) {
      data.push(moduleName);
    }

    data.should.have.members(['@voxpelli/workspace-a', '@voxpelli/workspace-z', 'foo', 'bar']);
  });
});

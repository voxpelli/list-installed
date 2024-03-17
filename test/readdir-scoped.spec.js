import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'desm';

import {
  readdirScoped,
} from '../lib/fs.js';

chai.use(chaiAsPromised);
const should = chai.should();

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
    for await (const moduleName of readdirScoped(join(import.meta.url, '../node_modules'))) {
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

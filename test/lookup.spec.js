import chai from 'chai';
import { join } from 'desm';

import { packageLookup } from '../lib/lookup.js';
import { pkgResult } from './fixtures/lookup.js';

chai.should();

describe('packageLookup', () => {
  it('should return data', async () => {
    await packageLookup().should.eventually
      .be.an('object')
      .with.keys('cwd', 'installed', 'pkg')
      .and.have.nested.property('pkg.name', 'list-installed');
  });

  it('should return data from cwd when specified', async () => {
    const cwd = join(import.meta.url, 'fixtures/workspace');
    const result = await packageLookup(cwd);

    result.should.be.an('object')
      .with.keys('cwd', 'installed', 'pkg')
      .that.deep.equals(pkgResult(cwd));
  });
});

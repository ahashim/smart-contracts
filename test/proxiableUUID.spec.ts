import { expect, run } from './setup';

describe('proxiableUUID', () => {
  it('reverts when calling through delegatecall', async () => {
    const { critter } = await run('initialize-contracts');

    await expect(critter.proxiableUUID()).to.be.revertedWith(
      'UUPSUpgradeable: must not be called through delegatecall'
    );
  });
});

import { expect, loadFixture, run } from './setup';
import type { Critter } from '../types';

describe('proxiableUUID', () => {
  let critter: Critter;

  const proxiableUUIDFixture = async () => await run('deploy-contract');

  before('load deployed contract fixture', async () => {
    critter = await loadFixture(proxiableUUIDFixture);
  });

  it('reverts when calling through delegatecall via the contract', async () => {
    await expect(critter.proxiableUUID()).to.be.revertedWith(
      'UUPSUpgradeable: must not be called through delegatecall'
    );
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { Critter } from '../typechain-types/contracts';

describe('proxiableUUID', () => {
  let critter: Critter;

  const proxiableUUIDFixture = async () =>
    await hardhat.run('deploy-contract');

  before('load deployed contract fixture', async () => {
    critter = await loadFixture(proxiableUUIDFixture);
  });

  it('reverts when calling through delegatecall via the contract', async () => {
    await expect(critter.proxiableUUID()).to.be.revertedWith(
      'UUPSUpgradeable: must not be called through delegatecall'
    );
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { CONTRACT_NAME } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('name', () => {
  let critter: Critter;

  before('load deployed contract fixture', async () => {
    const nameFixture = async () => await hardhat.run('deploy-contract');
    critter = await loadFixture(nameFixture);
  });

  it('returns the contract name', async () => {
    expect(await critter.name()).to.eq(CONTRACT_NAME);
  });
});

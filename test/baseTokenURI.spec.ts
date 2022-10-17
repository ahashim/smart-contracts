import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { BASE_TOKEN_URI } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('baseTokenURI', () => {
  let critter: Critter;

  const baseTokenURIFixture = async () => await hardhat.run('deploy-contract');

  it('returns the base token URI', async () => {
    critter = await loadFixture(baseTokenURIFixture);
    expect(await critter.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});

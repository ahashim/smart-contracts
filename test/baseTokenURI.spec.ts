import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { BASE_TOKEN_URI } from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('baseTokenURI', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const baseTokenURIFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(baseTokenURIFixture);
  });

  it('returns the base token URI', async () => {
    expect(await critter.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});

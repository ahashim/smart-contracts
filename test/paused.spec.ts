import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Critter } from '../typechain-types/contracts';
import type { Wallet } from 'ethers';

describe('paused', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const pausedFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture & pause it', async () => {
    critter = await loadFixture(pausedFixture);
  });

  it('returns false if the contract is unpaused', async () => {
    expect(await critter.paused()).to.be.false;
  });

  it('returns true if the contract is paused', async () => {
    // pause contract
    await critter.pause();

    expect(await critter.paused()).to.be.true;
  });
});

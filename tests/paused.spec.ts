import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

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

  const pausedFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract & pause it', async () => {
    critter = await loadFixture(pausedFixture);
  });

  it('returns false if the contract is unpaused', async () => {
    expect(await critter.paused()).to.be.false;
  });

  it('returns true if the contract is paused', async () => {
    await critter.pause();
    expect(await critter.paused()).to.be.true;
  });
});

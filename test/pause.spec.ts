import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';
import type { Wallet } from 'ethers';

describe('pause', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const pauseFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(pauseFixture);
  });

  it('pauses the contract', async () => {
    await critter.pause();
    expect(await critter.paused()).to.be.true;
  });

  it('reverts if someone without a PAUSER_ROLE tries to pause the contract', async () => {
    await expect(critter.connect(ahmed).pause()).to.be.reverted;
  });
});

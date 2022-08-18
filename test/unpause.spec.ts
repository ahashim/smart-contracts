import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';
import type { Wallet } from 'ethers';

describe('unpause', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const unpauseFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    critter.pause();

    return critter;
  };

  beforeEach('load deployed contract fixture & pause it', async () => {
    critter = await loadFixture(unpauseFixture);
  });

  it('unpauses the contract', async () => {
    await critter.unpause();
    expect(await critter.paused()).to.be.false;
  });

  it('reverts if someone without a PAUSER_ROLE tries to unpause the contract', async () => {
    await expect(critter.connect(ahmed).unpause()).to.be.reverted;
  });
});

import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  ADMIN_ROLE,
  OVERFLOW,
} from '../constants';
import { Configuration } from '../enums';

// types
import { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateConfiguration', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  // test variables
  const newMaxLevel = 100;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const updateConfigurationFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // the owner grants ahmed the ADMIN_ROLE
    await critter
      .connect(owner)
      .grantRole(ethers.utils.id(ADMIN_ROLE), ahmed.address);

    // ahmed increases the max level for scouts (note: A Critter account is not
    // required to update configuration)
    await critter.updateConfiguration(
      Configuration.ScoutMaxLevel,
      newMaxLevel
    );

    return critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(updateConfigurationFixture);
  });

  it('updates a contract configuration value', async () => {
    expect(await critter.config(Configuration.ScoutMaxLevel)).to.eq(
      newMaxLevel
    );
  });

  it('reverts when given an invalid configuration key', async () => {
    await expect(critter.config(69)).to.be.reverted;
  });

  it('reverts when the config amount is out of bounds', async () => {
    await expect(
      critter.updateConfiguration(Configuration.PoolPayoutThreshold, OVERFLOW)
    ).to.be.reverted;
  });
});

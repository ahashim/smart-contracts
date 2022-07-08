import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  SCOUT_MAX_LEVEL,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  SCOUT_BONUS,
  VIRALITY_THRESHOLD,
} from '../constants';

// types
import type { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';
import { Configuration } from '../enums';

describe('config', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const configFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(configFixture);
  });

  it('gets the platform take rate for interactions', async () => {
    expect(await critter.config(Configuration.PlatformTakeRate)).to.eq(
      PLATFORM_TAKE_RATE
    );
  });

  it('gets the scout pool payout threshold', async () => {
    expect(await critter.config(Configuration.PoolPayoutThreshold)).to.eq(
      SCOUT_POOL_THRESHOLD
    );
  });

  it('gets the max level a scout can reach', async () => {
    expect(await critter.config(Configuration.ScoutMaxLevel)).to.eq(
      SCOUT_MAX_LEVEL
    );
  });

  it('gets the bonus level increase a scout receives for propelling a squeak into virality', async () => {
    expect(await critter.config(Configuration.ScoutViralityBonus)).to.eq(
      SCOUT_BONUS
    );
  });

  it('gets the virality threshold for a squeak', async () => {
    expect(await critter.config(Configuration.ViralityThreshold)).to.eq(
      VIRALITY_THRESHOLD
    );
  });
});

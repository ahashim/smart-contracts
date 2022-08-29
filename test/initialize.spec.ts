import { expect } from 'chai';
import { run, waffle } from 'hardhat';
import {
  BASE_TOKEN_URI,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('initialize', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before('create fixture loader', async () => {
    loadFixture = waffle.createFixtureLoader();
  });

  const initializeFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(initializeFixture);
  });

  it('reverts when trying to initialize the contract more than once', async () => {
    await expect(
      critter.initialize(
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        SCOUT_POOL_THRESHOLD,
        VIRALITY_THRESHOLD,
        SCOUT_BONUS,
        SCOUT_MAX_LEVEL
      )
    ).to.be.reverted;
  });
});

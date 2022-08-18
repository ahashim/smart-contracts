import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
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
import type { ContractFactory, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('initialize', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const initializeFixture = async () => {
    const factory = (await ethers.getContractFactory(
      CONTRACT_NAME
    )) as ContractFactory;

    return (await upgrades.deployProxy(factory, [
      CONTRACT_NAME,
      CONTRACT_SYMBOL,
      BASE_TOKEN_URI,
      PLATFORM_FEE,
      PLATFORM_TAKE_RATE,
      SCOUT_POOL_THRESHOLD,
      VIRALITY_THRESHOLD,
      SCOUT_BONUS,
      SCOUT_MAX_LEVEL,
    ])) as Critter;
  };

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

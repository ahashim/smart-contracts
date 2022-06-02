import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  BASE_TOKEN_URI,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  PLATFORM_FEE,
  PLATFORM_FEE_PERCENT,
  VIRALITY_THRESHOLD,
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
      PLATFORM_FEE_PERCENT,
      VIRALITY_THRESHOLD,
    ])) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(initializeFixture);
  });

  it('reverts when trying to initialize the contract more than once', async () => {
    await expect(
      critter.initialize(
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_FEE_PERCENT,
        VIRALITY_THRESHOLD
      )
    ).to.be.reverted;
  });
});

import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE_PERCENT,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('platformFeePercent', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const platformFeePercentFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(platformFeePercentFixture);
  });

  it('returns the contract platform fee percent', async () => {
    expect(await critter.platformFeePercent()).to.eq(PLATFORM_FEE_PERCENT);
  });
});

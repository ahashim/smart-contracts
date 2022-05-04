import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('platformFee', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const platformFeeFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(platformFeeFixture);
  });

  it('returns the contract platform fee', async () => {
    expect(await critter.platformFee()).to.eq(PLATFORM_FEE);
  });
});

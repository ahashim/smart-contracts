import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_TAKE_RATE,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('platformTakeRate', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const platformTakeRateFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(platformTakeRateFixture);
  });

  it('returns the contract platform fee percent', async () => {
    expect(await critter.platformTakeRate()).to.eq(PLATFORM_TAKE_RATE);
  });
});

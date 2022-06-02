import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  VIRALITY_THRESHOLD,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('viralityThreshold', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const viralityThresholdFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(viralityThresholdFixture);
  });

  it('returns the contract platform fee', async () => {
    expect(await critter.viralityThreshold()).to.eq(VIRALITY_THRESHOLD);
  });
});

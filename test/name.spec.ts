import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('name', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const nameFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(nameFixture);
  });

  it('returns the contract name', async () => {
    expect(await critter.name()).to.eq(CONTRACT_NAME);
  });
});

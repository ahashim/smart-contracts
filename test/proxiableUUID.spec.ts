import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('proxiableUUID', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before('create fixture loader', async () => {
    loadFixture = waffle.createFixtureLoader();
  });

  const proxiableUUIDFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(proxiableUUIDFixture);
  });

  it('reverts when calling directly from the contract instead of a proxy', async () => {
    await expect(critter.proxiableUUID()).to.be.reverted;
  });
});

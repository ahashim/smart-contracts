import { expect } from 'chai';
import { run, waffle } from 'hardhat';

// types
import type { Critter } from '../typechain-types/contracts';

describe('proxiableUUID', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before('create fixture loader', async () => {
    loadFixture = waffle.createFixtureLoader();
  });

  const proxiableUUIDFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(proxiableUUIDFixture);
  });

  it('reverts when calling directly from the contract instead of a proxy', async () => {
    await expect(critter.proxiableUUID()).to.be.reverted;
  });
});

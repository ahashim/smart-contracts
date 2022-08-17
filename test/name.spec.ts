import { expect } from 'chai';
import { run, waffle } from 'hardhat';
import { CONTRACT_NAME } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('name', () => {
  let critter: Critter;

  before('load deployed contract fixture', async () => {
    const nameFixture = () => run('deploy-contract');
    critter = await waffle.createFixtureLoader()(nameFixture);
  });

  it('returns the contract name', async () => {
    expect(await critter.name()).to.eq(CONTRACT_NAME);
  });
});

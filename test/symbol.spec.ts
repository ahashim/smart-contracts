import { expect } from 'chai';
import { run, waffle } from 'hardhat';
import { CONTRACT_SYMBOL } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('symbol', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const symbolFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(symbolFixture);
  });

  it('returns the contract symbol', async () => {
    expect(await critter.symbol()).to.eq(CONTRACT_SYMBOL);
  });
});

import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  CONTRACT_INITIALIZER,
} from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('symbol', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;

  before(
    'create fixture loader',
    async () => (loadFixture = waffle.createFixtureLoader())
  );

  const symbolFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(symbolFixture);
  });

  it('returns the contract symbol', async () => {
    expect(await critter.symbol()).to.eq(CONTRACT_SYMBOL);
  });
});

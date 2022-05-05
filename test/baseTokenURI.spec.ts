import { Wallet } from 'ethers';
import { ethers, upgrades, waffle } from 'hardhat';
import { expect } from 'chai';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  BASE_TOKEN_URI,
} from '../constants';
import { Critter } from '../typechain-types/contracts';

describe('baseTokenURI', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const baseTokenURIFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(baseTokenURIFixture);
  });

  it('returns the base token URI', async () => {
    expect(await critter.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});

import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import { Relation } from '../enums';

describe('isFollowing', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const isFollowingFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed follows barbie
    await critter.updateRelationship(barbie.address, Relation.Follow);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(isFollowingFixture);
  });

  it('returns true if user one is following user two', async () => {
    expect(await critter.isFollowing(ahmed.address, barbie.address)).to.be
      .true;
  });
});

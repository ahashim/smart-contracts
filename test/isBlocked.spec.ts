import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import { Relation } from '../enums';

describe('isBlocked', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const isBlockedFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed blocks barbie
    await critter.updateRelationship(barbie.address, Relation.Block);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(isBlockedFixture);
  });

  it('lets a user block another user', async () => {
    expect(await critter.isBlocked(ahmed.address, barbie.address)).to.be.true;
  });
});

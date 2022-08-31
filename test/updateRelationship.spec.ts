import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { AccountStatus, Relations } from '../enums';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { RelationshipCounts } from '../types';

describe('updateRelationship', () => {
  let counts: {
    ahmed: RelationshipCounts;
    barbie: RelationshipCounts;
  };
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let txs: {
    follow?: ContractTransaction;
    unfollow?: ContractTransaction;
  } = {};

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const updateRelationshipFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed follows barbie
    txs.follow = await critter.updateRelationship(
      barbie.address,
      Relations.Follow
    );

    // barbie follows ahmed
    await critter
      .connect(barbie)
      .updateRelationship(ahmed.address, Relations.Follow);

    // ahmed unfollows barbie
    txs.unfollow = await critter.updateRelationship(
      barbie.address,
      Relations.Unfollow
    );

    return {
      counts: {
        ahmed: await critter.getRelationshipCounts(ahmed.address),
        barbie: await critter
          .connect(barbie)
          .getRelationshipCounts(barbie.address),
      },
      critter,
      txs,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ counts, critter, txs } = await loadFixture(updateRelationshipFixture));
  });

  describe('Follow', () => {
    it('lets a user follow another user', async () => {
      expect(counts.ahmed.followers).to.eq(1);
      expect(counts.barbie.following).to.eq(1);
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.follow)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, barbie.address, Relations.Follow);
    });

    it('reverts if the user is already being followed', async () => {
      await expect(
        critter
          .connect(barbie)
          .updateRelationship(ahmed.address, Relations.Follow)
      ).to.be.reverted;
    });
  });

  describe('Unfollow', () => {
    it('lets a user unfollow another user', async () => {
      expect(counts.barbie.followers).to.eq(0);
      expect(counts.ahmed.following).to.eq(0);
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.unfollow)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, barbie.address, Relations.Unfollow);
    });

    it('reverts if the user is not being followed', async () => {
      await expect(
        critter.updateRelationship(barbie.address, Relations.Unfollow)
      ).to.be.reverted;
    });
  });

  describe('Reverted', () => {
    it('reverts if the user acted upon is not an active account', async () => {
      // moderator suspends barbie's account
      await critter
        .connect(owner)
        .updateAccountStatus(barbie.address, AccountStatus.Suspended);

      await expect(
        critter.updateRelationship(barbie.address, Relations.Follow)
      ).to.be.reverted;
    });
  });
});

import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { AccountStatus, Relation } from '../enums';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateRelationship', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet,
    ahmed: Wallet,
    barbie: Wallet,
    carlos: Wallet,
    daphne: Wallet;
  let txs: {
    block?: ContractTransaction;
    follow?: ContractTransaction;
    unfollow?: ContractTransaction;
    unblock?: ContractTransaction;
  } = {};

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos, daphne] = await (
      ethers as any
    ).getSigners();
    loadFixture = waffle.createFixtureLoader([
      owner,
      ahmed,
      barbie,
      carlos,
      daphne,
    ]);
  });

  const updateRelationshipFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne],
      contract: critter,
    });

    // ahmed follows barbie
    txs.follow = await critter.updateRelationship(
      barbie.address,
      Relation.Follow
    );

    // ahmed follows carlos
    await critter.updateRelationship(carlos.address, Relation.Follow);

    // ahmed blocks daphne
    await critter.updateRelationship(daphne.address, Relation.Block);

    // barbie follows ahmed
    await critter
      .connect(barbie)
      .updateRelationship(ahmed.address, Relation.Follow);

    // carlos follows ahmed
    await critter
      .connect(carlos)
      .updateRelationship(ahmed.address, Relation.Follow);

    // ahmed unfollows barbie
    txs.unfollow = await critter.updateRelationship(
      barbie.address,
      Relation.Unfollow
    );

    // ahmed blocks carlos
    txs.block = await critter.updateRelationship(
      carlos.address,
      Relation.Block
    );

    // ahmed unblocks daphne
    txs.unblock = await critter.updateRelationship(
      daphne.address,
      Relation.Unblock
    );

    return {
      critter,
      txs,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, txs } = await loadFixture(updateRelationshipFixture));
  });

  describe('Follow', () => {
    it('lets a user follow another user', async () => {
      expect(await critter.isFollowing(barbie.address, ahmed.address)).to.be
        .true;
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.follow)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, barbie.address, Relation.Follow);
    });

    it('reverts if the user is already being followed', async () => {
      await expect(
        critter
          .connect(barbie)
          .updateRelationship(ahmed.address, Relation.Follow)
      ).to.be.reverted;
    });
  });

  describe('Unfollow', () => {
    it('lets a user unfollow another user', async () => {
      expect(await critter.isFollowing(ahmed.address, barbie.address)).to.be
        .false;
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.unfollow)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, barbie.address, Relation.Unfollow);
    });

    it('reverts if the user is not being followed', async () => {
      await expect(
        critter.updateRelationship(barbie.address, Relation.Unfollow)
      ).to.be.reverted;
    });
  });

  describe('Block', () => {
    it('lets a user block another user', async () => {
      expect(await critter.isBlocked(ahmed.address, carlos.address)).to.be
        .true;
    });

    it('breaks any existing relationship between users', async () => {
      expect(await critter.isFollowing(ahmed.address, carlos.address)).to.be
        .false;
      expect(await critter.isFollowing(carlos.address, ahmed.address)).to.be
        .false;
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.block)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, carlos.address, Relation.Block);
    });

    it('reverts if the user is already being blocked', async () => {
      await expect(critter.updateRelationship(carlos.address, Relation.Block))
        .to.be.reverted;
    });
  });

  describe('Unblock', () => {
    it('lets a user unblock another user', async () => {
      expect(await critter.isBlocked(ahmed.address, carlos.address)).to.be
        .true;
    });

    it('emits a RelationshipUpdated event', async () => {
      await expect(txs.unblock)
        .to.emit(critter, 'RelationshipUpdated')
        .withArgs(ahmed.address, daphne.address, Relation.Unblock);
    });

    it('reverts if the user has not been blocked', async () => {
      await expect(
        critter.updateRelationship(barbie.address, Relation.Unblock)
      ).to.be.reverted;
    });
  });

  describe('Reverted', () => {
    it('reverts when trying to update a relationship with themselves', async () => {
      await expect(critter.updateRelationship(ahmed.address, Relation.Follow))
        .to.be.reverted;
    });

    it('reverts if the user acted upon is not an active account', async () => {
      // moderator suspends barbie's account
      await critter
        .connect(owner)
        .updateAccountStatus(barbie.address, AccountStatus.Suspended);

      await expect(critter.updateRelationship(barbie.address, Relation.Follow))
        .to.be.reverted;
    });

    it('reverts if Relation value is invalid', async () => {
      await expect(critter.updateRelationship(barbie.address, 420)).to.be
        .reverted;
    });
  });
});

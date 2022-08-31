import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { AccountStatus, Relation } from '../enums';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateRelationship', () => {
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
      Relation.Follow
    );

    // barbie follows ahmed
    await critter
      .connect(barbie)
      .updateRelationship(ahmed.address, Relation.Follow);

    // ahmed unfollows barbie
    txs.unfollow = await critter.updateRelationship(
      barbie.address,
      Relation.Unfollow
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

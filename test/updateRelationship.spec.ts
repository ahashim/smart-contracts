import { Relation, Status } from '../enums';
import type {
  ContractTransaction,
  Critter,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('updateRelationship', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    daphne: SignerWithAddress,
    evan: SignerWithAddress,
    owner: SignerWithAddress;
  let txs: {
    block?: ContractTransaction;
    follow?: ContractTransaction;
    unfollow?: ContractTransaction;
    unblock?: ContractTransaction;
  } = {};

  const updateRelationshipFixture = async () => {
    [owner, ahmed, barbie, carlos, daphne, evan] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // create accounts (except evan)
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

    // owner bans daphne
    await critter.connect(owner).updateStatus(daphne.address, Status.Banned);

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
      ).to.be.revertedWithCustomError(critter, 'AlreadyFollowing');
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
      ).to.be.revertedWithCustomError(critter, 'NotFollowing');
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
      await expect(
        critter.updateRelationship(carlos.address, Relation.Block)
      ).to.be.revertedWithCustomError(critter, 'AlreadyBlocked');
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
      ).to.be.revertedWithCustomError(critter, 'NotBlocked');
    });
  });

  describe('Reverted', () => {
    it('reverts when trying to update a relationship with themselves', async () => {
      await expect(
        critter.updateRelationship(ahmed.address, Relation.Follow)
      ).to.be.revertedWithCustomError(critter, 'InvalidRelationship');
    });

    it('reverts when trying to update a relationship with themselves', async () => {
      await expect(
        critter.updateRelationship(ahmed.address, Relation.Follow)
      ).to.be.revertedWithCustomError(critter, 'InvalidRelationship');
    });

    it('reverts if the user acted upon is not an active account', async () => {
      // moderator suspends barbie's account
      await critter
        .connect(owner)
        .updateStatus(barbie.address, Status.Suspended);

      await expect(
        critter.updateRelationship(barbie.address, Relation.Follow)
      ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
    });

    it('reverts if the user updating the relationship does not have an account', async () => {
      await expect(
        critter
          .connect(evan)
          .updateRelationship(barbie.address, Relation.Follow)
      ).to.be.revertedWithCustomError(critter, 'InvalidAccount');
    });

    it('reverts if the status of the user updating the relationship is not active', async () => {
      await expect(
        critter
          .connect(daphne)
          .updateRelationship(barbie.address, Relation.Follow)
      ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
    });
  });
});

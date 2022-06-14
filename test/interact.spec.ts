import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  INTERACTION,
} from '../constants';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('interact', () => {
  let ahmedStartingBalance: BigNumber;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const interactFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // creates accounts
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(interactFixture));
    }
  );

  // test variables
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(PLATFORM_TAKE_RATE)
    .div(ethers.BigNumber.from(100));
  const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

  describe('Dislike', async () => {
    it('lets a user dislike a squeak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
      expect(await critter.getDislikeCount(squeakId)).to.eq(1);
    });

    it('removes a users previous like when disliking a squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
      expect(await critter.getLikeCount(squeakId)).to.eq(0);
      expect(await critter.getDislikeCount(squeakId)).to.eq(1);
    });

    it('deposits the dislike fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        PLATFORM_FEE
      );
    });

    it('emits a SqueakDisliked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE })
      )
        .to.emit(critter, 'SqueakDisliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already disliked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });
  });

  describe('Like', async () => {
    it('lets a user like a squeak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      expect(await critter.getLikeCount(squeakId)).to.eq(1);
    });

    it('removes a users previous "dislike" when liking a squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      expect(await critter.getDislikeCount(squeakId)).to.eq(0);
      expect(await critter.getLikeCount(squeakId)).to.eq(1);
    });

    it('deposits a portion of the like fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        treasuryFee
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedStartingBalance = await ahmed.getBalance();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      expect((await ahmed.getBalance()).sub(ahmedStartingBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakLiked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE })
      )
        .to.emit(critter, 'SqueakLiked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already liked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });
  });

  describe('Resqueak', async () => {
    it('lets a user resqueak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
      expect(await critter.getResqueakCount(squeakId)).to.eq(1);
    });

    it('deposits a portion of the resqueak fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        treasuryFee
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedStartingBalance = await ahmed.getBalance();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
      expect((await ahmed.getBalance()).sub(ahmedStartingBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a Resqueaked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE })
      )
        .to.emit(critter, 'Resqueaked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already resqueaked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });
  });

  describe('UndoDislike', async () => {
    beforeEach("barbie dislikes ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });
    });

    it('lets a user undo a dislike for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoDislike, { value: PLATFORM_FEE });
      expect(await critter.getDislikeCount(squeakId)).to.eq(0);
    });

    it('deposits a portion of the undo dislike fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoDislike, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        treasuryFee
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedStartingBalance = await ahmed.getBalance();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoDislike, { value: PLATFORM_FEE });
      expect((await ahmed.getBalance()).sub(ahmedStartingBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakUndisliked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.UndoDislike, { value: PLATFORM_FEE })
      )
        .to.emit(critter, 'SqueakUndisliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      await expect(
        critter.interact(squeakId, INTERACTION.UndoDislike, {
          value: PLATFORM_FEE,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoLike', async () => {
    beforeEach("barbie likes ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });
    });

    it('lets a user undo a like for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoLike, { value: PLATFORM_FEE });
      expect(await critter.getLikeCount(squeakId)).to.eq(0);
    });

    it('deposits the undo like fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoLike, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        PLATFORM_FEE
      );
    });

    it('emits a SqueakUnliked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.UndoLike, { value: PLATFORM_FEE })
      )
        .to.emit(critter, 'SqueakUnliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      await expect(
        critter.interact(squeakId, INTERACTION.UndoLike, {
          value: PLATFORM_FEE,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoResqueak', async () => {
    beforeEach("barbie resqueaks ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
    });

    it('lets a user undo a resqueak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoResqueak, { value: PLATFORM_FEE });
      expect(await critter.getLikeCount(squeakId)).to.eq(0);
    });

    it('deposits the undo resqueak fee into the treasury', async () => {
      treasuryStartingBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, INTERACTION.UndoResqueak, { value: PLATFORM_FEE });
      expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
        PLATFORM_FEE
      );
    });

    it('emits a Unresqueaked event', async () => {
      await expect(
        critter.connect(barbie).interact(squeakId, INTERACTION.UndoResqueak, {
          value: PLATFORM_FEE,
        })
      )
        .to.emit(critter, 'Unresqueaked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not resqueaked the squeak', async () => {
      await expect(
        critter.interact(squeakId, INTERACTION.UndoResqueak, {
          value: PLATFORM_FEE,
        })
      ).to.be.reverted;
    });
  });

  describe('Reverted', async () => {
    it('reverts when the interaction ID is invalid', async () => {
      await expect(
        critter.connect(barbie).interact(squeakId, 420, { value: 1 })
      ).to.be.reverted;
    });

    it('reverts when the interaction fee is not sufficient', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Like, { value: 1 })
      ).to.be.reverted;
    });

    it('reverts when the squeak does not exist', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(420, INTERACTION.Like, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });

    it('reverts when the user does not have an account', async () => {
      await expect(
        critter
          .connect(owner)
          .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });

    it('reverts when the contract is paused', async () => {
      await critter.connect(owner).pause();
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE })
      ).to.be.reverted;
    });
  });
});
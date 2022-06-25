import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { abi } from '../artifacts/contracts/Critter.sol/Critter.json';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
} from '../constants';
import { Interaction } from '../enums';

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

describe('interact basic', () => {
  let ahmedBalance: BigNumber, squeakId: BigNumber, treasuryBalance: BigNumber;
  let critter: Critter;
  let fees: {
    [name: string]: BigNumber;
  };
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;

  // the values below should be the same for all interactions (except delete),
  // so we can declare treasuryTake and transferAmount in terms of PLATFORM_FEE
  // and PLATFORM_TAKE_RATE
  const treasuryTake: number =
    PLATFORM_FEE.toNumber() * (PLATFORM_TAKE_RATE / 100);
  const transferAmount: number = PLATFORM_FEE.toNumber() - treasuryTake;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const interactBasicFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // creates accounts
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');

    // get interaction fees
    fees = {
      dislike: await critter.getInteractionFee(Interaction.Dislike),
      like: await critter.getInteractionFee(Interaction.Like),
      resqueak: await critter.getInteractionFee(Interaction.Resqueak),
      undoDislike: await critter.getInteractionFee(Interaction.UndoDislike),
      undoLike: await critter.getInteractionFee(Interaction.UndoLike),
      UndoResqueak: await critter.getInteractionFee(Interaction.UndoResqueak),
    };

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    return { critter, fees, squeakId };
  };

  // test variables

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, fees, squeakId } = await loadFixture(interactBasicFixture));
    }
  );

  describe('Dislike', async () => {
    it('lets a user dislike a squeak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Dislike)
      ).to.eq(1);
    });

    it('removes a users previous like when disliking a squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Like)
      ).to.eq(0);
      expect(
        await critter.getInteractionCount(squeakId, Interaction.Dislike)
      ).to.eq(1);
    });

    it('deposits the dislike fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });
      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.dislike
      );
    });

    it('emits a SqueakDisliked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Dislike, { value: fees.dislike })
      )
        .to.emit(critter, 'SqueakDisliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already disliked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Dislike, { value: fees.dislike })
      ).to.be.reverted;
    });
  });

  describe('Like', async () => {
    it('lets a user like a squeak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Like)
      ).to.eq(1);
    });

    it('removes a users previous "dislike" when liking a squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Dislike)
      ).to.eq(0);
      expect(
        await critter.getInteractionCount(squeakId, Interaction.Like)
      ).to.eq(1);
    });

    it('deposits a portion of the like fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedBalance = await ahmed.getBalance();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakLiked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      )
        .to.emit(critter, 'SqueakLiked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already liked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });

  describe('Resqueak', async () => {
    it('lets a user resqueak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Resqueak)
      ).to.eq(1);
    });

    it('deposits a portion of the resqueak fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedBalance = await ahmed.getBalance();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a Resqueaked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak })
      )
        .to.emit(critter, 'Resqueaked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has already resqueaked the squeak', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak })
      ).to.be.reverted;
    });
  });

  describe('UndoDislike', async () => {
    beforeEach("barbie dislikes ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });
    });

    it('lets a user undo a dislike for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Dislike)
      ).to.eq(0);
    });

    it('deposits a portion of the undo dislike fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      ahmedBalance = await ahmed.getBalance();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakUndisliked event', async () => {
      await expect(
        critter.connect(barbie).interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        })
      )
        .to.emit(critter, 'SqueakUndisliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      await expect(
        critter.interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoLike', async () => {
    beforeEach("barbie likes ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });
    });

    it('lets a user undo a like for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Like)
      ).to.eq(0);
    });

    it('deposits the undo like fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.undoLike
      );
    });

    it('emits a SqueakUnliked event', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike })
      )
        .to.emit(critter, 'SqueakUnliked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      await expect(
        critter.interact(squeakId, Interaction.UndoLike, {
          value: fees.undoLike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoResqueak', async () => {
    beforeEach("barbie resqueaks ahmed's squeak", async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });
    });

    it('lets a user undo a resqueak for a fee', async () => {
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect(
        await critter.getInteractionCount(squeakId, Interaction.Like)
      ).to.eq(0);
    });

    it('deposits the undo resqueak fee into the treasury', async () => {
      treasuryBalance = await critter.treasury();

      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.UndoResqueak
      );
    });

    it('emits a Unresqueaked event', async () => {
      await expect(
        critter.connect(barbie).interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        })
      )
        .to.emit(critter, 'Unresqueaked')
        .withArgs(barbie.address, squeakId);
    });

    it('reverts if the user has not resqueaked the squeak', async () => {
      await expect(
        critter.interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        })
      ).to.be.reverted;
    });
  });

  describe('Virality', () => {
    it('is not considered viral', async () => {
      expect(await critter.isViral(squeakId)).to.be.false;
    });

    it('returns a virality of zero when interactions do not meet criteria', async () => {
      expect(await critter.getViralityScore(squeakId)).to.eq(0);
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
          .interact(squeakId, Interaction.Like, { value: 1 })
      ).to.be.reverted;
    });

    it('reverts when the squeak does not exist', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(420, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });

    it('reverts when the user does not have an account', async () => {
      await expect(
        critter
          .connect(owner)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });

    it('reverts when the contract is paused', async () => {
      await critter.connect(owner).pause();

      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });
});

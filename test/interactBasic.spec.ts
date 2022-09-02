import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { PLATFORM_FEE, PLATFORM_TAKE_RATE } from '../constants';
import { AccountStatus, Interaction, Relation } from '../enums';

// types
import { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('interact basic', () => {
  let ahmedBalance: BigNumber,
    daphneSqueakId: BigNumber,
    ahmedSqueakId: BigNumber,
    treasuryBalance: BigNumber;
  let critter: Critter;
  let fees: {
    [name: string]: BigNumber;
  };
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet,
    ahmed: Wallet,
    barbie: Wallet,
    carlos: Wallet,
    daphne: Wallet;

  // the values below should be the same for all interactions (except delete),
  // so we can declare treasuryTake and transferAmount in terms of PLATFORM_FEE
  // and PLATFORM_TAKE_RATE
  const treasuryTake: number =
    PLATFORM_FEE.toNumber() * (PLATFORM_TAKE_RATE / 100);
  const transferAmount: number = PLATFORM_FEE.toNumber() - treasuryTake;

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

  const interactBasicFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne],
      contract: critter,
    });

    // get interaction fees
    fees = {
      dislike: await critter.fees(Interaction.Dislike),
      like: await critter.fees(Interaction.Like),
      resqueak: await critter.fees(Interaction.Resqueak),
      undoDislike: await critter.fees(Interaction.UndoDislike),
      undoLike: await critter.fees(Interaction.UndoLike),
      UndoResqueak: await critter.fees(Interaction.UndoResqueak),
    };

    // daphne posts a squeak
    ({ squeakId: daphneSqueakId } = await run('create-squeak', {
      content: 'is this thing on?',
      contract: critter,
      signer: daphne,
    }));

    // ahmed blocks daphne
    await critter.updateRelationship(daphne.address, Relation.Block);

    // ahmed posts a squeak
    ({ squeakId: ahmedSqueakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return {
      ahmedBalance: await ahmed.getBalance(),
      ahmedSqueakId,
      daphneSqueakId,
      critter,
      fees,
    };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak',
    async () => {
      ({ ahmedBalance, critter, daphneSqueakId, fees, ahmedSqueakId } =
        await loadFixture(interactBasicFixture));
    }
  );

  describe('Dislike', () => {
    it('lets a user dislike a squeak for a fee', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });

      expect((await critter.getSentimentCounts(ahmedSqueakId)).dislikes).to.eq(
        1
      );
    });

    it('removes a users previous like when disliking a squeak', async () => {
      // like then dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });

      const { likes, dislikes } = await critter.getSentimentCounts(
        ahmedSqueakId
      );

      expect(likes).to.eq(0);
      expect(dislikes).to.eq(1);
    });

    it('deposits the dislike fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.dislike
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // dislike squeak
      await expect(
        critter.connect(barbie).interact(ahmedSqueakId, Interaction.Dislike, {
          value: fees.dislike,
        })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.Dislike);
    });

    it('reverts if the user has already disliked the squeak', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });

      // dislike again
      await expect(
        critter.connect(barbie).interact(ahmedSqueakId, Interaction.Dislike, {
          value: fees.dislike,
        })
      ).to.be.reverted;
    });
  });

  describe('Like', () => {
    it('lets a user like a squeak for a fee', async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      expect((await critter.getSentimentCounts(ahmedSqueakId)).likes).to.eq(1);
    });

    it('removes a users previous "dislike" when liking a squeak', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });

      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      const { likes, dislikes } = await critter.getSentimentCounts(
        ahmedSqueakId
      );

      expect(dislikes).to.eq(0);
      expect(likes).to.eq(1);
    });

    it('deposits a portion of the like fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // like squeak
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, Interaction.Like, { value: fees.like })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.Like);
    });

    it('reverts if the user has already liked the squeak', async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      // like again
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });

  describe('Resqueak', () => {
    it('lets a user resqueak for a fee', async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        });

      expect(
        (await critter.getSentimentCounts(ahmedSqueakId)).resqueaks
      ).to.eq(1);
    });

    it('deposits a portion of the resqueak fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // resqueak
      await expect(
        critter.connect(barbie).interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.Resqueak);
    });

    it('reverts if the user has already resqueaked the squeak', async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        });

      // resqueak again
      await expect(
        critter.connect(barbie).interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoDislike', () => {
    beforeEach("barbie dislikes ahmed's squeak", async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Dislike, { value: fees.dislike });
    });

    it('lets a user undo a dislike for a fee', async () => {
      // undo dislike
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await critter.getSentimentCounts(ahmedSqueakId)).dislikes).to.eq(
        0
      );
    });

    it('deposits a portion of the undo dislike fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // undo dislike
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // undo dislike
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // undo dislike
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo dislike
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, Interaction.UndoDislike, {
            value: fees.undoDislike,
          })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.UndoDislike);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      // undo dislike
      await expect(
        critter.interact(ahmedSqueakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoLike', () => {
    beforeEach("barbie likes ahmed's squeak", async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });
    });

    it('lets a user undo a like for a fee', async () => {
      // undo like
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoLike, {
          value: fees.undoLike,
        });

      expect((await critter.getSentimentCounts(ahmedSqueakId)).likes).to.eq(0);
    });

    it('deposits the undo like fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // undo like
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoLike, {
          value: fees.undoLike,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.undoLike
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo like
      await expect(
        critter.connect(barbie).interact(ahmedSqueakId, Interaction.UndoLike, {
          value: fees.undoLike,
        })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.UndoLike);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      // undo like
      await expect(
        critter.interact(ahmedSqueakId, Interaction.UndoLike, {
          value: fees.undoLike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoResqueak', () => {
    beforeEach("barbie resqueaks ahmed's squeak", async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Resqueak, {
          value: fees.resqueak,
        });
    });

    it('lets a user undo a resqueak for a fee', async () => {
      // undo resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect(
        (await critter.getSentimentCounts(ahmedSqueakId)).resqueaks
      ).to.eq(0);
    });

    it('deposits the undo resqueak fee into the treasury', async () => {
      // snapshot balance
      treasuryBalance = await critter.treasury();

      // undo resqueak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.UndoResqueak
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo resqueak
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, Interaction.UndoResqueak, {
            value: fees.UndoResqueak,
          })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(ahmedSqueakId, barbie.address, Interaction.UndoResqueak);
    });

    it('reverts if the user has not resqueaked the squeak', async () => {
      // undo resqueak
      await expect(
        critter.interact(ahmedSqueakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        })
      ).to.be.reverted;
    });
  });

  describe('Fees', () => {
    it('refunds any excess amount paid beyond the required interaction fee', async () => {
      const interactionFee = await critter.fees(Interaction.Dislike);
      const treasuryBalance = await critter.treasury();

      // carlos dislikes the squeak w/ double the fee
      const tx = await critter
        .connect(carlos)
        .interact(ahmedSqueakId, Interaction.Dislike, {
          value: interactionFee.mul(2),
        });

      // treasury deposits just the fee
      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        interactionFee
      );

      // carlos receives his refund
      await expect(tx)
        .to.emit(critter, 'FundsTransferred')
        .withArgs(carlos.address, interactionFee);
    });
  });

  describe('Moderation', () => {
    it('deposits the full fee into the treasury when interacting with a banned account', async () => {
      // ban ahmed
      await critter
        .connect(owner)
        .updateAccountStatus(ahmed.address, AccountStatus.Banned);

      // snapshot balances
      ahmedBalance = await ahmed.getBalance();
      treasuryBalance = await critter.treasury();

      // barbie likes ahmeds squeak
      await critter
        .connect(barbie)
        .interact(ahmedSqueakId, Interaction.Like, { value: fees.like });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(fees.like);
      expect(await ahmed.getBalance()).to.eq(ahmedBalance);
    });

    it('reverts when interacting with the squeak of a blocked user', async () => {
      await expect(
        critter.interact(daphneSqueakId, Interaction.Like, {
          value: fees.like,
        })
      ).to.be.reverted;
    });

    it('reverts when a blocked user interacts with your squeak', async () => {
      await expect(
        critter.connect(daphne).interact(ahmedSqueakId, Interaction.Like, {
          value: fees.like,
        })
      ).to.be.reverted;
    });
  });

  describe('Virality', () => {
    it('is not considered viral', async () => {
      expect(await critter.isViral(ahmedSqueakId)).to.be.false;
    });

    it('returns a virality of zero when interactions do not meet criteria', async () => {
      expect(await critter.getViralityScore(ahmedSqueakId)).to.eq(0);
    });
  });

  describe('Reverted', () => {
    it('reverts when the interaction ID is invalid', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, 420, { value: fees.like })
      ).to.be.reverted;
    });

    it('reverts when the interaction fee is not sufficient', async () => {
      await expect(
        critter
          .connect(barbie)
          .interact(ahmedSqueakId, Interaction.Like, { value: 1 })
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
          .interact(ahmedSqueakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });

    it('reverts when account is not active', async () => {
      // ban ahmed
      await critter
        .connect(owner)
        .updateAccountStatus(ahmed.address, AccountStatus.Banned);

      await expect(
        critter.interact(ahmedSqueakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });
});

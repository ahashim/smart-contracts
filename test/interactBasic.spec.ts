import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
} from '../constants';
import { AccountStatus, Interaction } from '../enums';

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
      dislike: await critter.fees(Interaction.Dislike),
      like: await critter.fees(Interaction.Like),
      resqueak: await critter.fees(Interaction.Resqueak),
      undoDislike: await critter.fees(Interaction.UndoDislike),
      undoLike: await critter.fees(Interaction.UndoLike),
      UndoResqueak: await critter.fees(Interaction.UndoResqueak),
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

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, fees, squeakId } = await loadFixture(interactBasicFixture));
    }
  );

  describe('Dislike', async () => {
    it('lets a user dislike a squeak for a fee', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      expect((await critter.getSentimentCounts(squeakId)).dislikes).to.eq(1);
    });

    it('removes a users previous like when disliking a squeak', async () => {
      // like then dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      const { likes, dislikes } = await critter.getSentimentCounts(squeakId);

      expect(likes).to.eq(0);
      expect(dislikes).to.eq(1);
    });

    it('deposits the dislike fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.dislike
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // dislike squeak
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Dislike, { value: fees.dislike })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.Dislike);
    });

    it('reverts if the user has already disliked the squeak', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      // dislike again
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Dislike, { value: fees.dislike })
      ).to.be.reverted;
    });
  });

  describe('Like', async () => {
    it('lets a user like a squeak for a fee', async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await critter.getSentimentCounts(squeakId)).likes).to.eq(1);
    });

    it('removes a users previous "dislike" when liking a squeak', async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      const { likes, dislikes } = await critter.getSentimentCounts(squeakId);

      expect(dislikes).to.eq(0);
      expect(likes).to.eq(1);
    });

    it('deposits a portion of the like fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // snapshot balance
      ahmedBalance = await ahmed.getBalance();

      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // like squeak
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.Like);
    });

    it('reverts if the user has already liked the squeak', async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });

      // like again
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });

  describe('Resqueak', async () => {
    it('lets a user resqueak for a fee', async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect((await critter.getSentimentCounts(squeakId)).resqueaks).to.eq(1);
    });

    it('deposits a portion of the resqueak fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        treasuryTake
      );
    });

    it('transfers the remaining fee to the squeak owner', async () => {
      // snapshot balance
      ahmedBalance = await ahmed.getBalance();

      // resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // resqueak
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.Resqueak);
    });

    it('reverts if the user has already resqueaked the squeak', async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });

      // resqueak again
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak })
      ).to.be.reverted;
    });
  });

  describe('UndoDislike', async () => {
    beforeEach("barbie dislikes ahmed's squeak", async () => {
      // dislike squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Dislike, { value: fees.dislike });
    });

    it('lets a user undo a dislike for a fee', async () => {
      // undo dislike
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await critter.getSentimentCounts(squeakId)).dislikes).to.eq(0);
    });

    it('deposits a portion of the undo dislike fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // undo dislike
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
      // snapshot balance
      ahmedBalance = await ahmed.getBalance();

      // undo dislike
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
      // snapshot balance
      ahmedBalance = await ahmed.getBalance();

      // undo dislike
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        });

      expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
        transferAmount
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo dislike
      await expect(
        critter.connect(barbie).interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.UndoDislike);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      // undo dislike
      await expect(
        critter.interact(squeakId, Interaction.UndoDislike, {
          value: fees.undoDislike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoLike', async () => {
    beforeEach("barbie likes ahmed's squeak", async () => {
      // like squeak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: fees.like });
    });

    it('lets a user undo a like for a fee', async () => {
      // undo like
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike });

      expect((await critter.getSentimentCounts(squeakId)).likes).to.eq(0);
    });

    it('deposits the undo like fee into the treasury', async () => {
      // snapshot treasury
      treasuryBalance = await critter.treasury();

      // undo like
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.undoLike
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo like
      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.UndoLike, { value: fees.undoLike })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.UndoLike);
    });

    it('reverts if the user has not disliked the squeak', async () => {
      // undo like
      await expect(
        critter.interact(squeakId, Interaction.UndoLike, {
          value: fees.undoLike,
        })
      ).to.be.reverted;
    });
  });

  describe('UndoResqueak', async () => {
    beforeEach("barbie resqueaks ahmed's squeak", async () => {
      // resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });
    });

    it('lets a user undo a resqueak for a fee', async () => {
      // undo resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect((await critter.getSentimentCounts(squeakId)).resqueaks).to.eq(0);
    });

    it('deposits the undo resqueak fee into the treasury', async () => {
      // snapshot balance
      treasuryBalance = await critter.treasury();

      // undo resqueak
      await critter
        .connect(barbie)
        .interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
        fees.UndoResqueak
      );
    });

    it('emits a SqueakInteraction event', async () => {
      // undo resqueak
      await expect(
        critter.connect(barbie).interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        })
      )
        .to.emit(critter, 'SqueakInteraction')
        .withArgs(squeakId, barbie.address, Interaction.UndoResqueak);
    });

    it('reverts if the user has not resqueaked the squeak', async () => {
      // undo resqueak
      await expect(
        critter.interact(squeakId, Interaction.UndoResqueak, {
          value: fees.UndoResqueak,
        })
      ).to.be.reverted;
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
        .interact(squeakId, Interaction.Like, { value: fees.like });

      expect((await critter.treasury()).sub(treasuryBalance)).to.eq(fees.like);
      expect(await ahmed.getBalance()).to.eq(ahmedBalance);
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
        critter.connect(barbie).interact(squeakId, 420, { value: fees.like })
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

    it('reverts when account is not active', async () => {
      // ban ahmed
      await critter
        .connect(owner)
        .updateAccountStatus(ahmed.address, AccountStatus.Banned);

      await expect(
        critter.interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });

    it('reverts when the contract is paused', async () => {
      // pause the contract
      await critter.connect(owner).pause();

      await expect(
        critter
          .connect(barbie)
          .interact(squeakId, Interaction.Like, { value: fees.like })
      ).to.be.reverted;
    });
  });
});

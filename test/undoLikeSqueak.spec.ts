import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  INTERACTION,
  PLATFORM_FEE,
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

describe('undoLikeSqueak', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber, treasuryEndingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const undoLikeSqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // create accounts
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

    // barbie dislikes it
    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak that barbie likes',
    async () => {
      ({ critter, squeakId } = await loadFixture(undoLikeSqueakFixture));
    }
  );

  it('lets a user undo a like for a fee', async () => {
    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.UndoLike, { value: PLATFORM_FEE });
    expect(await critter.getDislikeCount(squeakId)).to.eq(0);
  });

  it('deposits the undo like fee into the treasury', async () => {
    treasuryStartingBalance = await critter.treasury();
    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.UndoLike, { value: PLATFORM_FEE });
    treasuryEndingBalance = await critter.treasury();
    expect(treasuryEndingBalance.sub(treasuryStartingBalance)).to.eq(
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
      .withArgs(barbie.address, 0);
  });

  it('reverts if the user has not liked the squeak', async () => {
    await expect(
      critter.interact(squeakId, INTERACTION.UndoLike, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the undo like fee is not sufficient', async () => {
    await expect(
      critter.connect(barbie).interact(squeakId, INTERACTION.UndoLike, {
        value: 1,
      })
    ).to.be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.connect(barbie).interact(420, INTERACTION.UndoLike, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).interact(squeakId, INTERACTION.UndoLike, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(
      critter.connect(barbie).interact(squeakId, INTERACTION.UndoLike, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });
});

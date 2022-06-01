import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
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

describe('undoDislikeSqueak', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber, treasuryEndingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const undoDislikeSqueakFixture = async () => {
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
      .dislikeSqueak(squeakId, { value: PLATFORM_FEE });

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak that barbie dislikes',
    async () => {
      ({ critter, squeakId } = await loadFixture(undoDislikeSqueakFixture));
    }
  );

  it('lets a user undo a dislike for a fee', async () => {
    await critter
      .connect(barbie)
      .undoDislikeSqueak(squeakId, { value: PLATFORM_FEE });
    expect(await critter.getDislikeCount(squeakId)).to.eq(0);
  });

  it('deposits the undo dislike fee into the treasury', async () => {
    treasuryStartingBalance = await critter.treasury();
    await critter
      .connect(barbie)
      .undoDislikeSqueak(squeakId, { value: PLATFORM_FEE });
    treasuryEndingBalance = await critter.treasury();
    expect(treasuryEndingBalance.sub(treasuryStartingBalance)).to.eq(
      PLATFORM_FEE
    );
  });

  it('emits a SqueakUndisliked event', async () => {
    await expect(
      critter
        .connect(barbie)
        .undoDislikeSqueak(squeakId, { value: PLATFORM_FEE })
    )
      .to.emit(critter, 'SqueakUndisliked')
      .withArgs(barbie.address, squeakId);
  });

  it('reverts if the user has not disliked the squeak', async () => {
    await expect(critter.undoDislikeSqueak(squeakId, { value: PLATFORM_FEE }))
      .to.be.reverted;
  });

  it('reverts when the undo dislike fee is not sufficient', async () => {
    await expect(
      critter.connect(barbie).undoDislikeSqueak(squeakId, { value: 1 })
    ).to.be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.connect(barbie).undoDislikeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter
        .connect(owner)
        .undoDislikeSqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(
      critter
        .connect(barbie)
        .undoDislikeSqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});
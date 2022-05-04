import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_FEE_PERCENT,
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

describe('likeSqueak', () => {
  let ahmedStartingBalance: BigNumber, ahmedEndingBalance: BigNumber;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber, treasuryEndingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const likeSqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // creates accounts
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');
    await critter.connect(carlos).createAccount('carlos');

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // carlos dislikes it
    await critter
      .connect(carlos)
      .dislikeSqueak(squeakId, { value: PLATFORM_FEE });

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak that carlos dislikes',
    async () => {
      ({ critter, squeakId } = await loadFixture(likeSqueakFixture));
    }
  );

  // test variables
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(PLATFORM_FEE_PERCENT)
    .div(ethers.BigNumber.from(100));
  const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

  it('lets a user like a squeak for a fee', async () => {
    await critter
      .connect(barbie)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    expect(await critter.getLikeCount(squeakId)).to.eq(1);
  });

  it('removes a users previous "dislike" when liking a squeak', async () => {
    await critter
      .connect(carlos)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    expect(await critter.getDislikeCount(squeakId)).to.eq(0);
    expect(await critter.getLikeCount(squeakId)).to.eq(1);
  });

  it('deposits a portion of the like fee into the treasury', async () => {
    treasuryStartingBalance = await critter.treasury();
    await critter
      .connect(barbie)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    treasuryEndingBalance = await critter.treasury();
    expect(treasuryEndingBalance.sub(treasuryStartingBalance)).to.eq(
      treasuryFee
    );
  });

  it('transfers the remaining fee to the squeak owner', async () => {
    ahmedStartingBalance = await ahmed.getBalance();
    await critter
      .connect(barbie)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    ahmedEndingBalance = await ahmed.getBalance();
    expect(ahmedEndingBalance.sub(ahmedStartingBalance)).to.eq(transferAmount);
  });

  it('emits a SqueakLiked event', async () => {
    await expect(
      critter.connect(barbie).likeSqueak(squeakId, { value: PLATFORM_FEE })
    )
      .to.emit(critter, 'SqueakLiked')
      .withArgs(barbie.address, squeakId);
  });

  it('reverts if the user has already liked the squeak', async () => {
    await critter
      .connect(barbie)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    await expect(
      critter.connect(barbie).likeSqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the like fee is not sufficient', async () => {
    await expect(critter.connect(barbie).likeSqueak(squeakId, { value: 1 })).to
      .be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.connect(barbie).likeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).likeSqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(
      critter.connect(barbie).likeSqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});

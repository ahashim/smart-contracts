import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONFIRMATION_THRESHOLD,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  INTERACTION,
  SCOUT_BONUS,
} from '../constants';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import type { ScoutPool, Squeak } from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('deleteViralSqueak', () => {
  let critter: Critter;
  let carlosBalance: BigNumber,
    deleteFee: BigNumber,
    likes: BigNumber,
    dislikes: BigNumber,
    poolUnit: BigNumber,
    resqueaks: BigNumber,
    squeakId: BigNumber,
    treasuryBalance: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet,
    ahmed: Wallet,
    barbie: Wallet,
    carlos: Wallet,
    daphne: Wallet;
  let scouts: string[];
  let scoutPool: ScoutPool;
  let squeak: Squeak;

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

  const deleteViralSqueakFixture = async () => {
    // deploy contract with a lower virality & scout pool threshold for testing
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        ethers.utils.parseEther('0.000002'), // scout pool threshold
        60, // virality threshold
        SCOUT_BONUS,
      ])
    ).connect(ahmed) as Critter;

    // creates accounts
    [ahmed, barbie, carlos, daphne].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    // current virality score: 0
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed & barbie resqueak it
    // current virality score: 0
    [ahmed, barbie].forEach(async (account) => {
      await critter
        .connect(account)
        .interact(squeakId, INTERACTION.Resqueak, { value: PLATFORM_FEE });
    });

    // carlos likes it, and thus makes it eligible for virality
    // current virality score: 58
    await critter
      .connect(carlos)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    // daphne likes it, and brings the score past the virality threshold
    // current virality score: 63
    await critter
      .connect(daphne)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    // take a snapshot of a scouts balance
    carlosBalance = await carlos.getBalance();
    treasuryBalance = await critter.treasury();

    // get pool unit
    const pool = await critter.getScoutPool(squeakId);
    poolUnit = pool.amount.div(pool.levelTotal);

    // ahmed delets the viral squeak
    deleteFee = await critter.getDeleteFee(squeakId, CONFIRMATION_THRESHOLD);
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    return {
      carlosBalance,
      critter,
      likes: await critter.getLikeCount(squeakId),
      dislikes: await critter.getDislikeCount(squeakId),
      poolUnit,
      resqueaks: await critter.getResqueakCount(squeakId),
      scouts: await critter.getScouts(squeakId),
      scoutPool: await critter.getScoutPool(squeakId),
      squeak: await critter.squeaks(squeakId),
      squeakId,
      treasuryBalance,
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates viral squeak and then deletes it',
    async () => {
      ({
        carlosBalance,
        critter,
        likes,
        dislikes,
        poolUnit,
        resqueaks,
        scouts,
        scoutPool,
        squeak,
        squeakId,
      } = await loadFixture(deleteViralSqueakFixture));
    }
  );

  it('deletes the viral squeak', () => {
    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq('');
  });

  it("deletes the viral squeak's associated sentiment", async () => {
    expect(likes).to.eq(0);
    expect(dislikes).to.eq(0);
    expect(resqueaks).to.eq(0);
  });

  it("deletes the viral squeak's scout information", async () => {
    expect(scouts).to.be.empty;
    expect(scoutPool.amount).to.eq(0);
    expect(scoutPool.levelTotal).to.eq(0);
  });

  it('pays out to pool members before deletion', async () => {
    // tested more thouroughly in {interactViral.spec.ts}
    expect((await carlos.getBalance()).sub(carlosBalance)).to.eq(
      poolUnit.mul((await critter.users(carlos.address)).scoutLevel)
    );
  });

  it('deposits the remaining dust into the treasury', async () => {
    // tested more thouroughly in {interactViral.spec.ts}
    expect(
      (await critter.treasury()).sub(treasuryBalance.add(deleteFee))
    ).to.eq(4);
  });
});

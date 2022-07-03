import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONFIRMATION_THRESHOLD,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  EMPTY_BYTE_STRING,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
} from '../constants';
import { Interaction } from '../enums';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type {
  BigNumberObject,
  PoolInfo,
  Scout,
  SentimentCounts,
  Squeak,
} from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('deleteViralSqueak', () => {
  let critter: Critter;
  let balances: BigNumberObject;
  let deleteFee: BigNumber, sharePrice: BigNumber, squeakId: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet,
    ahmed: Wallet,
    barbie: Wallet,
    carlos: Wallet,
    daphne: Wallet;
  let poolInfo: PoolInfo;
  let sentimentCounts: SentimentCounts;
  let scouts: Scout[];
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
        SCOUT_MAX_LEVEL,
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
      await critter.connect(account).interact(squeakId, Interaction.Resqueak, {
        value: await critter.getInteractionFee(Interaction.Resqueak),
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    // current virality score: 58
    await critter.connect(carlos).interact(squeakId, Interaction.Like, {
      value: await critter.getInteractionFee(Interaction.Like),
    });

    // daphne likes it, and brings the score past the virality threshold
    // current virality score: 63
    await critter.connect(daphne).interact(squeakId, Interaction.Like, {
      value: await critter.getInteractionFee(Interaction.Like),
    });

    // take a snapshot of scouts balance
    const barbieBalance = await barbie.getBalance();
    const carlosBalance = await carlos.getBalance();
    const daphneBalance = await daphne.getBalance();
    const treasuryBalance = await critter.treasury();

    // get share price before deletion
    const { amount, shares } = await critter.getPoolInfo(squeakId);
    sharePrice = amount.div(shares);

    // ahmed deletes the viral squeak
    deleteFee = await critter.getDeleteFee(squeakId, CONFIRMATION_THRESHOLD);
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    return {
      balances: {
        barbie: barbieBalance,
        carlos: carlosBalance,
        daphne: daphneBalance,
        treasury: treasuryBalance,
      },
      critter,
      deleteFee,
      poolInfo: await critter.getPoolInfo(squeakId),
      sentimentCounts: await critter.getSentimentCounts(squeakId),
      sharePrice,
      scouts: await critter.getScouts(squeakId),
      scoutPool: await critter.getPoolInfo(squeakId),
      squeak: await critter.squeaks(squeakId),
      squeakId,
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates viral squeak and then deletes it',
    async () => {
      ({
        balances,
        critter,
        deleteFee,
        poolInfo,
        sentimentCounts,
        sharePrice,
        scouts,
        squeak,
        squeakId,
      } = await loadFixture(deleteViralSqueakFixture));
    }
  );

  it('deletes the viral squeak', () => {
    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it("deletes the viral squeak's associated sentiment", async () => {
    const { likes, dislikes, resqueaks } = sentimentCounts;

    expect(likes).to.eq(0);
    expect(dislikes).to.eq(0);
    expect(resqueaks).to.eq(0);
  });

  it("deletes the viral squeak's scout information", async () => {
    expect(scouts).to.be.empty;
    expect(poolInfo.amount).to.eq(0);
    expect(poolInfo.shares).to.eq(0);
  });

  it('pays out to pool members before deletion', async () => {
    expect((await barbie.getBalance()).sub(balances.barbie)).to.eq(
      sharePrice.mul((await critter.users(barbie.address)).scoutLevel)
    );
    expect((await carlos.getBalance()).sub(balances.carlos)).to.eq(
      sharePrice.mul((await critter.users(carlos.address)).scoutLevel)
    );
    expect((await daphne.getBalance()).sub(balances.daphne)).to.eq(
      sharePrice.mul((await critter.users(daphne.address)).scoutLevel)
    );
  });

  it('deposits the remaining dust into the treasury', async () => {
    expect(
      (await critter.treasury()).sub(balances.treasury.add(deleteFee))
    ).to.eq(9);
  });
});

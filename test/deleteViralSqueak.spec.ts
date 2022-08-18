import { expect } from 'chai';
import { ethers, run, upgrades, waffle } from 'hardhat';
import {
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
import type { BigNumber, Wallet } from 'ethers';
import type {
  BigNumberObject,
  PoolInfo,
  Scout,
  SentimentCounts,
  Squeak,
} from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('deleteViralSqueak', () => {
  let amount: BigNumber,
    deleteFee: BigNumber,
    sharePrice: BigNumber,
    squeakId: BigNumber;
  let critter: Critter;
  let balances: BigNumberObject;
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

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne],
      contract: critter,
    });

    // ahmed creates a squeak
    // current virality score: 0
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed & barbie resqueak it
    // current virality score: 0
    [ahmed, barbie].forEach(async (signer) => {
      await run('interact', {
        contract: critter,
        interaction: Interaction.Resqueak,
        signer,
        squeakId,
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    // current virality score: 58
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    // daphne likes it, and brings the score past the virality threshold
    // current virality score: 63
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: daphne,
      squeakId,
    });

    // snapshot all scout balances
    balances = {
      barbie: await barbie.getBalance(),
      carlos: await carlos.getBalance(),
      daphne: await daphne.getBalance(),
      treasury: await critter.treasury(),
    };

    // get pool info for the viral squeak before deletion
    // NOTE: the `amount` is the remaining dust in the pool before getting
    // added to the treasury due to members already being paid out in the
    // previous transaction due to the lower scout pool threshold.
    const { amount, shares } = await critter.getPoolInfo(squeakId);

    // ahmed deletes the viral squeak
    ({ deleteFee } = await run('delete-squeak', {
      contract: critter,
      signer: ahmed,
      squeakId,
    }));

    return {
      amount,
      balances,
      critter,
      deleteFee,
      poolInfo: await critter.getPoolInfo(squeakId),
      sentimentCounts: await critter.getSentimentCounts(squeakId),
      sharePrice: amount.div(shares),
      scouts: await critter.getScouts(squeakId),
      squeak: await critter.squeaks(squeakId),
      squeakId,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({
      amount,
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
  });

  it('deletes the viral squeak', () => {
    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it("deletes the viral squeak's associated sentiment", async () => {
    expect(sentimentCounts.likes).to.eq(0);
    expect(sentimentCounts.dislikes).to.eq(0);
    expect(sentimentCounts.resqueaks).to.eq(0);
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

  it('deposits the delete fee into the treasury', async () => {
    // subtracting `amount` because it's the remaining dust that was deposited
    // into the treasury when deleting the scout pool for the viral squeak
    expect(
      (await critter.treasury()).sub(balances.treasury).sub(amount)
    ).to.eq(deleteFee);
  });
});

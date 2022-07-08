import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
  SCOUT_POOL_THRESHOLD,
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
import type { Critter } from '../typechain-types/contracts';
import type { PoolInfo } from '../types';

describe('getPoolInfo', () => {
  let critter: Critter;
  let squeakId: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let poolInfo: PoolInfo, invalidPool: PoolInfo;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getPoolInfoFixture = async () => {
    // deploy contract with a lower virality threshold for testing
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        SCOUT_POOL_THRESHOLD,
        1, // virality threshold
        SCOUT_BONUS,
        SCOUT_MAX_LEVEL,
      ])
    ).connect(ahmed) as Critter;

    // creates accounts
    [ahmed, barbie, carlos].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed & barbie resqueak it
    [ahmed, barbie].forEach(async (account) => {
      await critter.connect(account).interact(squeakId, Interaction.Resqueak, {
        value: await critter.fees(Interaction.Resqueak),
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    await critter.connect(carlos).interact(squeakId, Interaction.Like, {
      value: await critter.fees(Interaction.Like),
    });

    return {
      poolInfo: await critter.getPoolInfo(squeakId),
      invalidPool: await critter.getPoolInfo(420),
    };
  };

  beforeEach('deploy test contract', async () => {
    ({ poolInfo, invalidPool } = await loadFixture(getPoolInfoFixture));
  });

  it('returns the funds available in the scout pool', async () => {
    // carlos' interaction fee will be split & added to the pool
    const interactionTake = PLATFORM_FEE.mul(PLATFORM_TAKE_RATE).div(100);
    const expectedAmount = PLATFORM_FEE.sub(interactionTake).div(2);

    expect(poolInfo.amount).to.eq(expectedAmount);
  });

  it('returns the total number of shares in the scout pool', async () => {
    // each scout levels up to 2, plus carlos' scout bonus
    const expectedShares = 3 * 2 + SCOUT_BONUS;
    expect(poolInfo.shares).to.eq(expectedShares);
  });

  it('returns the count of members in the scout pool', async () => {
    // ahmed, barbie, and carlos are all in the pool
    expect(poolInfo.memberCount).to.eq(3);
  });

  it('returns zero values for a non-existent pool', async () => {
    expect(invalidPool.amount).to.eq(0);
    expect(invalidPool.shares).to.eq(0);
    expect(invalidPool.memberCount).to.eq(0);
  });
});

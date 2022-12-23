import { BONUS, PLATFORM_FEE, PLATFORM_TAKE_RATE } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  ContractTransaction,
  Critter,
  PoolInfo,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('getPoolInfo', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    invalidPool: PoolInfo,
    poolInfo: PoolInfo,
    squeakId: BigNumber,
    tx: ContractTransaction;

  const getPoolInfoFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    // deploy contract with a lower virality threshold
    critter = (
      await run('deploy-contracts', {
        viralityThreshold: 1,
      })
    ).critter.connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed & barbie resqueak it
    [ahmed, barbie].forEach(async (signer) => {
      await run('interact', {
        contract: critter,
        interaction: Interaction.Resqueak,
        signer,
        squeakId,
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    tx = await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    return {
      poolInfo: await critter.getPoolInfo(squeakId),
      invalidPool: await critter.getPoolInfo(420),
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ poolInfo, invalidPool, tx } = await loadFixture(getPoolInfoFixture));
  });

  it('returns the funds available in the pool', () => {
    // carlos' interaction fee will be split & added to the pool
    const interactionTake = PLATFORM_FEE.mul(PLATFORM_TAKE_RATE).div(100);
    const expectedAmount = PLATFORM_FEE.sub(interactionTake).div(2);

    expect(poolInfo.amount).to.eq(expectedAmount);
  });

  it('returns the total number of shares in the pool', () => {
    // each user levels up to 2, plus carlos' level bonus
    const expectedShares = 3 * 2 + BONUS;
    expect(poolInfo.shares).to.eq(expectedShares);
  });

  it('returns the number of users in the pool', () => {
    // ahmed, barbie, and carlos are all in the pool
    expect(poolInfo.passCount).to.eq(3);
  });

  it('returns the number of the block in which the pool was created', () => {
    // ahmed, barbie, and carlos are all in the pool
    expect(poolInfo.blockNumber).to.eq(tx.blockNumber);
  });

  it('returns the virality score of the squeak associated with the pool', () => {
    // ahmed, barbie, and carlos are all in the pool
    expect(poolInfo.score).to.eq(58);
  });

  it('returns zero values for an unknown pool', () => {
    expect(invalidPool.amount).to.eq(0);
    expect(invalidPool.shares).to.eq(0);
    expect(invalidPool.passCount).to.eq(0);
  });
});

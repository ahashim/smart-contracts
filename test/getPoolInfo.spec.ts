import { ethers, expect, loadFixture, run } from './setup';
import { PLATFORM_FEE, PLATFORM_TAKE_RATE, SCOUT_BONUS } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  Critter,
  PoolInfo,
  SignerWithAddress,
} from '../types';

describe('getPoolInfo', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    invalidPool: PoolInfo,
    poolInfo: PoolInfo,
    squeakId: BigNumber;

  const getPoolInfoFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    // deploy contract with a lower virality threshold
    critter = (
      await run('deploy-contract', {
        viralityThreshold: 1,
      })
    ).connect(ahmed);

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
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    return {
      poolInfo: await critter.getPoolInfo(squeakId),
      invalidPool: await critter.getPoolInfo(420),
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ poolInfo, invalidPool } = await loadFixture(getPoolInfoFixture));
  });

  it('returns the funds available in the scout pool', () => {
    // carlos' interaction fee will be split & added to the pool
    const interactionTake = PLATFORM_FEE.mul(PLATFORM_TAKE_RATE).div(100);
    const expectedAmount = PLATFORM_FEE.sub(interactionTake).div(2);

    expect(poolInfo.amount).to.eq(expectedAmount);
  });

  it('returns the total number of shares in the scout pool', () => {
    // each scout levels up to 2, plus carlos' scout bonus
    const expectedShares = 3 * 2 + SCOUT_BONUS;
    expect(poolInfo.shares).to.eq(expectedShares);
  });

  it('returns the count of members in the scout pool', () => {
    // ahmed, barbie, and carlos are all in the pool
    expect(poolInfo.memberCount).to.eq(3);
  });

  it('returns zero values for an unknown pool', () => {
    expect(invalidPool.amount).to.eq(0);
    expect(invalidPool.shares).to.eq(0);
    expect(invalidPool.memberCount).to.eq(0);
  });
});

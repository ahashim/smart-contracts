import { ethers, expect, loadFixture, run } from './setup';
import { EMPTY_BYTE_STRING } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  Critter,
  PoolInfo,
  Scout,
  SentimentCounts,
  SignerWithAddress,
  Squeak,
} from '../types';

describe('deleteViralSqueak', () => {
  let amount: BigNumber,
    deleteFee: BigNumber,
    squeakId: BigNumber,
    treasuryBalance: BigNumber,
    critter: Critter,
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    daphne: SignerWithAddress,
    poolInfo: PoolInfo,
    sentimentCounts: SentimentCounts,
    scouts: Scout[],
    squeak: Squeak;

  const deleteViralSqueakFixture = async () => {
    [, ahmed, barbie, carlos, daphne] = await ethers.getSigners();
    // deploy contract with a lower virality & scout pool threshold for testing
    critter = (
      await run('deploy-contract', {
        scoutPoolThreshold: ethers.utils.parseEther('0.000002'),
        viralityThreshold: 60,
      })
    ).connect(ahmed);

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

    // carlos likes it and makes it eligible for virality
    // current virality score: 58
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    // daphne likes it and brings the score past the virality threshold
    // current virality score: 63
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: daphne,
      squeakId,
    });

    // assert virality
    expect(await critter.isViral(squeakId)).to.be.true;

    // snapshot treasury balance
    treasuryBalance = await critter.treasury();

    // NOTE: the `amount` here is the remaining dust in the pool before being
    // deposited into the treasury due to scouts already being paid out in the
    // previous transaction because of the lower scout pool threshold.
    const { amount } = await critter.getPoolInfo(squeakId);

    // ahmed deletes the viral squeak
    ({ deleteFee } = await run('delete-squeak', {
      contract: critter,
      signer: ahmed,
      squeakId,
    }));

    return {
      amount,
      critter,
      deleteFee,
      poolInfo: await critter.getPoolInfo(squeakId),
      sentimentCounts: await critter.getSentimentCounts(squeakId),
      scouts: await critter.getScouts(squeakId),
      squeak: await critter.squeaks(squeakId),
      treasuryBalance,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({
      amount,
      critter,
      deleteFee,
      poolInfo,
      sentimentCounts,
      scouts,
      squeak,
      treasuryBalance,
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

  it('deposits the delete fee into the treasury', async () => {
    // subtracting `amount` because it's the remaining dust that was deposited
    // into the treasury when deleting the scout pool for the viral squeak
    expect((await critter.treasury()).sub(treasuryBalance).sub(amount)).to.eq(
      deleteFee
    );
  });
});

import { Interaction } from '../enums';
import type {
  BigNumber,
  Critter,
  SentimentCounts,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('getSentimentCounts', () => {
  let critter: Critter,
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    sentimentCounts: SentimentCounts,
    squeakId: BigNumber;

  const getSentimentCountsFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    critter = (await run('deploy-critter-contract')).critter.connect(ahmed);

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

    // ahmed resqueaks it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: ahmed,
      squeakId,
    });

    // barbie likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: barbie,
      squeakId,
    });

    // carlos dislikes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Dislike,
      signer: carlos,
      squeakId,
    });

    return {
      critter,
      sentimentCounts: await critter.getSentimentCounts(squeakId),
      squeakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates a squeak which is interacted with',
    async () => {
      ({ critter, sentimentCounts, squeakId } = await loadFixture(
        getSentimentCountsFixture
      ));
    }
  );

  it('gets the dislike count of a squeak', () => {
    expect(sentimentCounts.dislikes).to.equal(1);
  });

  it('gets the like count of a squeak', () => {
    expect(sentimentCounts.likes).to.equal(1);
  });

  it('gets the resqueak count of a squeak', () => {
    expect(sentimentCounts.resqueaks).to.equal(1);
  });

  it('returns zero when querying for an unknown squeak', async () => {
    const { dislikes, likes, resqueaks } = await critter.getSentimentCounts(
      420
    );

    expect(dislikes).to.equal(0);
    expect(likes).to.equal(0);
    expect(resqueaks).to.equal(0);
  });
});

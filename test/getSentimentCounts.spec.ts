import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { OVERFLOW } from '../constants';
import { Interaction } from '../enums';

// types
import type { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { SentimentCounts } from '../types';

describe('getSentimentCounts', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let sentimentCounts: SentimentCounts;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getSentimentCountsFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

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

  it('gets the dislike count of a squeak', async () => {
    expect(sentimentCounts.dislikes).to.equal(1);
  });

  it('gets the like count of a squeak', async () => {
    expect(sentimentCounts.likes).to.equal(1);
  });

  it('gets the resqueak count of a squeak', async () => {
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

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.getSentimentCounts(-1)).to.be.reverted;
    await expect(critter.getSentimentCounts(OVERFLOW)).to.be.reverted;
  });
});

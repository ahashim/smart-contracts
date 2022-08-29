import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { OVERFLOW } from '../constants';
import { Interaction } from '../enums';

// types
import type { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('getViralityScore', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let nonViralSqueakId: BigNumber, viralSqueakId: BigNumber;
  let sentiment: {
    [key: string]: number;
  };

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getViralityScoreFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed creates an account & posts a squeak
    ({ squeakId: viralSqueakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // everybody likes it
    [ahmed, barbie, carlos].forEach(async (signer) => {
      await run('interact', {
        contract: critter,
        interaction: Interaction.Like,
        signer,
        squeakId: viralSqueakId,
      });
    });

    // everybody resqueaks it
    [ahmed, barbie, carlos].forEach(async (signer) => {
      await run('interact', {
        contract: critter,
        interaction: Interaction.Resqueak,
        signer,
        squeakId: viralSqueakId,
      });
    });

    // barbie posts a squeak that nobody interacts with
    ({ squeakId: nonViralSqueakId } = await run('create-squeak', {
      content: 'come on barbie, lets go party',
      contract: critter,
      signer: ahmed,
    }));

    return {
      critter,
      nonViralSqueakId,
      viralSqueakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates a squeak that everybody likes',
    async () => {
      ({ critter, nonViralSqueakId, viralSqueakId } = await loadFixture(
        getViralityScoreFixture
      ));
    }
  );

  it('gets the virality score of a squeak', async () => {
    // get sentiment counts
    const counts = await critter.getSentimentCounts(viralSqueakId);

    // convert from BigNumber -> number for use with {Math}
    sentiment = {};
    for (const key in counts) {
      sentiment[key] = counts[key].toNumber();
    }
    let { dislikes, likes, resqueaks } = sentiment;

    // calculate blockDelta for the viral squeak
    const latestBlock = (await ethers.provider.getBlock('latest')).number;
    const publishedBlock = (
      await critter.squeaks(viralSqueakId)
    ).blockNumber.toNumber();
    const blockDelta = latestBlock - publishedBlock;

    // ensure no division by zero when taking the ratio of likes:dislikes
    dislikes = dislikes === 0 ? 1 : dislikes;

    // calculate expected virality score based on likes, dislikes, resqueaks,
    // and blockDelta
    const ratio = Math.sqrt(likes / dislikes);
    const total = Math.log(likes + dislikes);
    const amplifier = Math.log(resqueaks) / resqueaks;
    const order = ratio * total * amplifier;
    const coefficient = order !== 0 ? 1 / order : 0;
    const expectedScore = Math.round(1000 / (blockDelta + coefficient + 10));

    expect((await critter.getViralityScore(viralSqueakId)).toNumber()).to.eq(
      expectedScore
    );
  });

  it('returns a score of zero when the squeak does not meet the minimum virality requirement', async () => {
    expect(
      (await critter.getViralityScore(nonViralSqueakId)).toNumber()
    ).to.equal(0);
  });

  it('reverts when querying for a nonexistent squeak', async () => {
    await expect(critter.getViralityScore(420)).to.be.reverted;
  });

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.getViralityScore(-1)).to.be.reverted;
    await expect(critter.getViralityScore(OVERFLOW)).to.be.reverted;
  });
});

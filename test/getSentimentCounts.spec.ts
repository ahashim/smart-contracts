import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { SentimentCounts } from '../types';

describe('getSentimentCounts', () => {
  let critter: Critter;
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress;
  let sentimentCounts: SentimentCounts;
  let squeakId: BigNumber;

  const getSentimentCountsFixture = async () => {
    [, ahmed, barbie, carlos] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed resqueaks it
    await hardhat.run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: ahmed,
      squeakId,
    });

    // barbie likes it
    await hardhat.run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: barbie,
      squeakId,
    });

    // carlos dislikes it
    await hardhat.run('interact', {
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
});

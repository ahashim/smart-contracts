import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER, OVERFLOW } from '../constants';
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
import type { SentimentCounts } from '../types';

describe('getSentimentCounts', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let sentimentCounts: SentimentCounts;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getSentimentCountsFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // everybody creates an account
    [ahmed, barbie, carlos].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    tx = await critter.createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed resqueaks it
    await critter.interact(squeakId, Interaction.Resqueak, {
      value: await critter.fees(Interaction.Resqueak),
    });

    // barbie likes it
    await critter.connect(barbie).interact(squeakId, Interaction.Like, {
      value: await critter.fees(Interaction.Like),
    });

    // carlos dislikes it
    await critter.connect(carlos).interact(squeakId, Interaction.Dislike, {
      value: await critter.fees(Interaction.Dislike),
    });

    return {
      critter,
      sentimentCounts: await critter.getSentimentCounts(squeakId),
      squeakId,
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates a squeak which is interacted with',
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

  it('returns zero when querying for a nonexistent squeak', async () => {
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

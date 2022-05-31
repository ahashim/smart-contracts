import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
} from '../constants';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('getViralityScore', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let blockDelta: number, likes: number, dislikes: number, resqueaks: number;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getViralityScoreFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // everybody creates an account
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');
    await critter.connect(carlos).createAccount('carlos');

    // ahmed creates an account & posts a squeak
    tx = await critter.createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // everybody likes it
    await critter.likeSqueak(squeakId, { value: PLATFORM_FEE });
    await critter
      .connect(barbie)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });
    await critter
      .connect(carlos)
      .likeSqueak(squeakId, { value: PLATFORM_FEE });

    // everybody resqueaks it
    await critter.resqueak(squeakId, { value: PLATFORM_FEE });
    await critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE });
    await critter.connect(carlos).resqueak(squeakId, { value: PLATFORM_FEE });

    // calculate blockDelta
    const latestBlock = (await ethers.provider.getBlock('latest')).number;
    const publishedBlock = (
      await critter.squeaks(squeakId)
    ).blockNumber.toNumber();

    return {
      blockDelta: latestBlock - publishedBlock,
      critter,
      squeakId,
      likes: (await critter.getLikeCount(squeakId)).toNumber(),
      dislikes: (await critter.getDislikeCount(squeakId)).toNumber(),
      resqueaks: (await critter.getResqueakCount(squeakId)).toNumber(),
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates a squeak that everybody likes',
    async () => {
      ({ blockDelta, critter, dislikes, likes, resqueaks, squeakId } =
        await loadFixture(getViralityScoreFixture));
    }
  );

  // test variables
  const overflow = ethers.constants.MaxUint256.add(ethers.BigNumber.from(1));

  it('gets the virality score of a squeak', async () => {
    // ensure no division by zero when taking the ratio of likes:dislikes
    dislikes = dislikes === 0 ? 1 : dislikes;

    // calculate expected virality score based on likes, dislikes, and resqueaks
    const ratio = Math.sqrt(likes / dislikes);
    const total = Math.log(likes + dislikes);
    const amplifier = Math.log(resqueaks) / resqueaks;
    const order = ratio * total * amplifier;
    const coefficient = order !== 0 ? 1 / order : 0;
    const expectedScore = 1000 / (blockDelta + coefficient + 10);
    const delta = 0.4;

    expect(
      (await critter.getViralityScore(squeakId)).toNumber()
    ).to.be.closeTo(expectedScore, delta);
  });

  it('reverts when querying for a nonexistent squeak', async () => {
    await expect(critter.getViralityScore(420)).to.be.reverted;
  });

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.getViralityScore(-1)).to.be.reverted;
    await expect(critter.getViralityScore(overflow)).to.be.reverted;
  });
});

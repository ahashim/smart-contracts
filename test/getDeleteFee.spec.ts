import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import { Interaction } from '../enums';

describe('getDeleteFee', () => {
  let blockAuthored: BigNumber, squeakId: BigNumber;
  let critter: Critter;
  let expectedFee: number, latestBlock: number;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const getDeleteFeeFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(getDeleteFeeFixture));
  });

  it('calculates a delete fee for a squeak based on when it was created', async () => {
    const defaultConfirmationThreshold = 6; // defaults to 6 under the hood
    ({ blockNumber: blockAuthored } = await critter.squeaks(squeakId));
    ({ number: latestBlock } = await ethers.provider.getBlock('latest'));
    expectedFee =
      (latestBlock + defaultConfirmationThreshold - blockAuthored.toNumber()) *
      (await critter.fees(Interaction.Delete)).toNumber();

    expect(await critter.getDeleteFee(squeakId)).to.eq(expectedFee);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getDeleteFee(420)).to.be.reverted;
  });
});

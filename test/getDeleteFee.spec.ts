import { ethers, expect, loadFixture, run } from './setup';
import { Configuration } from '../enums';
import type { BigNumber, Critter, SignerWithAddress } from '../types';

describe('getDeleteFee', () => {
  let ahmed: SignerWithAddress,
    blockCreated: BigNumber,
    critter: Critter,
    expectedFee: number,
    latestBlock: number,
    squeakId: BigNumber;

  const getDeleteFeeFixture = async () => {
    [, ahmed] = await ethers.getSigners();
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
    ({ blockNumber: blockCreated } = await critter.squeaks(squeakId));
    ({ number: latestBlock } = await ethers.provider.getBlock('latest'));
    expectedFee =
      (latestBlock + defaultConfirmationThreshold - blockCreated.toNumber()) *
      (await critter.config(Configuration.DeleteRate)).toNumber();

    expect(await critter.getDeleteFee(squeakId)).to.eq(expectedFee);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getDeleteFee(420)).to.be.reverted;
  });
});

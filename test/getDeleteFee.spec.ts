import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('getDeleteFee', () => {
  let ahmed: SignerWithAddress,
    blockCreated: BigNumber,
    critter: Critter,
    expectedFee: number,
    latestBlock: number,
    squeakId: BigNumber;

  const getDeleteFeeFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
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
    ({ number: latestBlock } = await hardhat.ethers.provider.getBlock(
      'latest'
    ));
    expectedFee =
      (latestBlock + defaultConfirmationThreshold - blockCreated.toNumber()) *
      (await critter.fees(Interaction.Delete)).toNumber();

    expect(await critter.getDeleteFee(squeakId)).to.eq(expectedFee);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getDeleteFee(420)).to.be.reverted;
  });
});

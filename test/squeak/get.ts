// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { twoAccountsOneSqueak } from '../fixtures';
import { BLOCK_CONFIRMATION_THRESHOLD, PLATFORM_FEE } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Get squeak information', () => {
  const fixture = twoAccountsOneSqueak;
  let contract: Contract;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;
  let carlos: SignerWithAddress;
  let tokenId: number;

  beforeEach(
    ` Deploy contracts.
      Create accounts for Ahmed & Barbie, but not Carlos.
      Ahmed posts a squeak.`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(fixture);
      [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
    }
  );

  it('lets anybody get basic squeak information', async () => {
    const squeak = await contract.squeaks(tokenId);
    const expectedContent = 'this is the wei';

    expect(squeak.author).to.equal(ahmed.address);
    expect(squeak.owner).to.equal(ahmed.address);
    expect(squeak.content).to.equal(expectedContent);
  });

  it('lets anybody get a delete fee for an existing squeak', async () => {
    // get squeak data
    const squeak = await contract.squeaks(tokenId);

    // calculate the fee expected to delete it
    const { number: latestBlockNumber } = await ethers.provider.getBlock(
      'latest'
    );
    const latestBlockThreshold =
      latestBlockNumber + BLOCK_CONFIRMATION_THRESHOLD;
    const expectedFee =
      (latestBlockThreshold - squeak.blockNumber) * PLATFORM_FEE;

    // carlos does not have a critter account, but is able calculate the
    // delete fee for ahmeds squeak from the contract
    const fee = await contract
      .connect(carlos)
      .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

    // assert expected fee matches the actual delete fee
    expect(fee).to.equal(expectedFee);
  });

  it('lets anybody get the dislike count of a squeak', async () => {
    // assert the squeak has no dislikes
    expect(await contract.getDislikeCount(tokenId)).to.equal(0);

    // barbie dislikes it
    await run('dislikeSqueak', {
      contract,
      signer: barbie,
      tokenId,
    });

    // assert the squeak now has a like
    expect(await contract.getDislikeCount(tokenId)).to.equal(1);
  });

  it('lets anybody get the like count of a squeak', async () => {
    // assert the squeak has no likes
    expect(await contract.getLikeCount(tokenId)).to.equal(0);

    // barbie likes it
    await run('likeSqueak', {
      contract,
      signer: barbie,
      tokenId,
    });

    // assert the squeak now has a like
    expect(await contract.getLikeCount(tokenId)).to.equal(1);
  });

  it('reverts when getting delete fees for a nonexistent squeak', async () => {
    await expect(contract.getDeleteFee(420, BLOCK_CONFIRMATION_THRESHOLD)).to
      .be.reverted;
  });

  it('reverts when getting delete fees with a negative block confirmation threshold', async () => {
    await expect(contract.getDeleteFee(420, -7)).to.be.reverted;
  });

  it('reverts when getting the dislike count of a nonexistent squeak', async () => {
    await expect(contract.getDislikeCount(420)).to.be.reverted;
  });

  it('reverts when getting the like count of a nonexistent squeak', async () => {
    await expect(contract.getLikeCount(420)).to.be.reverted;
  });
});

// libraries
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { twoAccountsOneSqueak } from '../fixtures';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

let contract: Contract;
let ahmed: SignerWithAddress;
let barbie: SignerWithAddress;
let tokenId: number;

describe('Transfer a squeak', () => {
  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie, but not Carlos.
        Ahmed posts a squeak.`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
      [, ahmed, barbie] = await ethers.getSigners();
    }
  );

  it('lets a user transfers squeak ownership to another user', async () => {
    let squeak = await contract.squeaks(tokenId);

    // assert ahmed owns the token
    expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
    expect(squeak.owner).to.equal(ahmed.address);

    // ahmed transfers the token to barbie (an unregistered account)
    const transferTx = await contract
      .connect(ahmed)
      .transferFrom(ahmed.address, barbie.address, tokenId);
    await transferTx.wait();
    squeak = await contract.squeaks(tokenId);

    // assert events
    expect(transferTx)
      .to.emit(contract, 'Transfer')
      .withArgs(ahmed.address, barbie.address, tokenId);

    // assert barbie now owns the token
    expect(await contract.ownerOf(tokenId)).to.equal(barbie.address);
    expect(squeak.owner).to.equal(barbie.address);
  });

  it('reverts if a signer who does not own the token tries to transfer it', async () => {
    let squeak = await contract.squeaks(tokenId);

    // assert ahmed owns the token
    expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
    expect(squeak.owner).to.equal(ahmed.address);

    // barbie (an unregistered account) attempts to transfers the token
    await expect(
      contract
        .connect(barbie)
        .transferFrom(ahmed.address, barbie.address, tokenId)
    ).to.be.reverted;

    // assert ahmed still owns the token
    squeak = await contract.squeaks(tokenId);
    expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
    expect(squeak.owner).to.equal(ahmed.address);
  });
});

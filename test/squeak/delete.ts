// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { twoAccountsOneSqueak } from '../fixtures';
import { BLOCK_CONFIRMATION_THRESHOLD } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Delete squeak', () => {
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
      [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
      [, ahmed, barbie, carlos] = await ethers.getSigners();
    }
  );

  it('lets a user delete a squeak they own', async () => {
    // assert existence/ownership
    expect(await contract.balanceOf(ahmed.address)).to.equal(1);
    expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);

    // delete the squeak
    const deleteFee = await contract.getDeleteFee(
      tokenId,
      BLOCK_CONFIRMATION_THRESHOLD
    );
    const tx = await contract
      .connect(ahmed)
      .deleteSqueak(tokenId, { value: deleteFee });
    await tx.wait();

    // assert correct event info
    await expect(tx)
      .to.emit(contract, 'SqueakDeleted')
      .withArgs(ahmed.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(deleteFee);

    // assert it no longer exists
    expect(await contract.balanceOf(ahmed.address)).to.equal(0);
    await expect(contract.ownerOf(tokenId)).to.be.reverted;
  });

  it('deposits fees for a deleted squeak into the treasury', async () => {
    // assert the treasury is empty & ahmed has one squeak
    expect(await contract.treasury()).to.equal(0);
    expect(await contract.balanceOf(ahmed.address)).to.equal(1);

    // calculate the fee to delete the squeak
    const fee = await contract
      .connect(ahmed)
      .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

    // delete the squeak
    await run('deleteSqueak', {
      contract,
      signer: ahmed,
      tokenId,
    });

    // assert ahmed has 1 less squeak now & treasury received the fees
    expect(await contract.balanceOf(ahmed.address)).to.equal(0);
    expect(await contract.treasury()).to.equal(fee);
  });

  it('reverts when the user does not pay enough to delete the squeak', async () => {
    await expect(
      contract.connect(ahmed).deleteSqueak(tokenId, {
        value: 1, // one wei
      })
    ).to.be.reverted;
  });

  it('reverts when a user tries to delete a squeak they do not own', async () => {
    await expect(contract.connect(barbie).deleteSqueak(tokenId)).to.be
      .reverted;
  });

  it('reverts when the user does have an account', async () => {
    await expect(contract.connect(carlos).deleteSqueak(tokenId)).to.be
      .reverted;
  });
});

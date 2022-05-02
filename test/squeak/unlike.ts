// libraries
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { twoAccountsOneLikedSqueak } from '../fixtures';
import { PLATFORM_FEE } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

let contract: Contract;
let ahmed: SignerWithAddress;
let barbie: SignerWithAddress;
let carlos: SignerWithAddress;
let tokenId: number;

describe.skip('Undo like', () => {
  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie.
        Ahmed posts a squeak.
        Barbie likes Ahmed's squeak`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(
        twoAccountsOneLikedSqueak
      );
      [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
    }
  );

  it('lets a user unlike a squeak', async () => {
    const treasuryStartingBalance = await contract.treasury();

    // assert squeak has 1 like
    expect(await contract.getLikeCount(tokenId)).to.equal(1);

    // barbie undoes her like of ahmeds squeak
    const tx = await contract
      .connect(barbie)
      .undoLikeSqueak(tokenId, { value: PLATFORM_FEE });
    await tx.wait();
    const treasuryEndBalance = treasuryStartingBalance.add(PLATFORM_FEE);

    // assert events
    await expect(tx)
      .to.emit(contract, 'SqueakUnliked')
      .withArgs(barbie.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(PLATFORM_FEE);

    // assert squeak has been unliked, and treasury received funds from barbie
    expect(await contract.getLikeCount(tokenId)).to.equal(0);
    expect(await contract.treasury()).to.equal(treasuryEndBalance);
  });

  it('reverts if a user has not initially liked the squeak', async () => {
    await expect(
      contract.connect(ahmed).undoLikeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.revertedWith('Critter: cannot unlike a squeak that is not liked');
  });

  it('reverts if a user does not have an account', async () => {
    await expect(
      contract.connect(carlos).undoLikeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts if a user does not have enough funds', async () => {
    await expect(
      contract.connect(barbie).undoLikeSqueak(tokenId, { value: 1 })
    ).to.be.reverted;
  });

  it('reverts if a user tries to unlike a nonexistent squeak ', async () => {
    await expect(
      contract.connect(barbie).undoLikeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.revertedWith(
      'Critter: cannot perform action on a nonexistent token'
    );
  });
});

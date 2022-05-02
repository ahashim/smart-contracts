// libraries
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { twoAccountsOneDislikedSqueak } from '../fixtures';
import { PLATFORM_FEE } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

let contract: Contract;
let ahmed: SignerWithAddress;
let barbie: SignerWithAddress;
let carlos: SignerWithAddress;
let tokenId: number;

describe('Undo dislike', () => {
  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie.
        Ahmed posts a squeak.
        Barbie dislikes Ahmed's squeak`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(
        twoAccountsOneDislikedSqueak
      );
      [, ahmed, barbie, carlos] = await ethers.getSigners();
    }
  );

  it('lets a user undislike a squeak', async () => {
    const treasuryStartingBalance = await contract.treasury();

    // assert squeak has 1 dislike
    expect(await contract.getDislikeCount(tokenId)).to.equal(1);

    // barbie undoes her dislike of ahmeds squeak
    const tx = await contract
      .connect(barbie)
      .undoDislikeSqueak(tokenId, { value: PLATFORM_FEE });
    await tx.wait();
    const treasuryEndBalance = treasuryStartingBalance.add(PLATFORM_FEE);

    // assert events
    await expect(tx)
      .to.emit(contract, 'SqueakUndisliked')
      .withArgs(barbie.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(PLATFORM_FEE);

    // assert squeak has been unliked, and treasury received funds from barbie
    expect(await contract.getDislikeCount(tokenId)).to.equal(0);
    expect(await contract.treasury()).to.equal(treasuryEndBalance);
  });

  it('reverts if a user has not initially disliked the squeak', async () => {
    await expect(
      contract
        .connect(ahmed)
        .undoDislikeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.revertedWith(
      'Critter: cannot undislike a squeak that is not disliked'
    );
  });

  it('reverts if a user does not have an account', async () => {
    await expect(
      contract
        .connect(carlos)
        .undoDislikeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.revertedWith('Critter: address does not have an account');
  });

  it('reverts if a user does not have enough funds', async () => {
    await expect(
      contract.connect(barbie).undoDislikeSqueak(tokenId, { value: 1 })
    ).to.be.reverted;
  });

  it('reverts if a user tries to undislike a nonexistent squeak ', async () => {
    await expect(
      contract.connect(barbie).undoDislikeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.revertedWith(
      'Critter: cannot perform action on a nonexistent token'
    );
  });
});

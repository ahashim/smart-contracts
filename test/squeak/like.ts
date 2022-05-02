import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { twoAccountsOneSqueak } from '../fixtures';
import { PLATFORM_FEE, PLATFORM_FEE_PERCENT } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

let contract: Contract;
let ahmed: SignerWithAddress;
let barbie: SignerWithAddress;
let carlos: SignerWithAddress;
let tokenId: number;

// treasury fees & amount a user earns per transaction
const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
  .mul(ethers.BigNumber.from(PLATFORM_FEE_PERCENT))
  .div(ethers.BigNumber.from(100));
const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

describe('Liking a squeak', () => {
  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie, but not Carlos.
        Ahmed posts a squeak.`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
      [, ahmed, barbie, carlos] = await ethers.getSigners();
    }
  );

  it('lets a user like a squeak', async () => {
    const ahmedStartingBalance = await ahmed.getBalance();

    // assert has no likes & treasury is empty
    expect(await contract.treasury()).to.equal(0);
    expect(await contract.getLikeCount(tokenId)).to.equal(0);

    // barbie likes ahmeds squeak
    const tx = await contract
      .connect(barbie)
      .likeSqueak(tokenId, { value: PLATFORM_FEE });
    await tx.wait();

    // assert events
    await expect(tx)
      .to.emit(contract, 'SqueakLiked')
      .withArgs(barbie.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(treasuryFee)
      .and.to.emit(contract, 'FundsTransferred')
      .withArgs(ahmed.address, transferAmount);

    // assert squeak has one like
    expect(await contract.getLikeCount(tokenId)).to.equal(1);

    // assert ahmed & treasury now have funds from barbie via the platform
    expect(await contract.treasury()).to.equal(treasuryFee);
    expect(await ahmed.getBalance()).to.equal(
      ahmedStartingBalance.add(transferAmount)
    );
  });

  it('reverts if a user does not have an account', async () => {
    await expect(
      contract.connect(carlos).likeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts if a user does not have enough funds', async () => {
    await expect(contract.connect(barbie).likeSqueak(tokenId, { value: 1 })).to
      .be.reverted;
  });

  it('reverts if a user tries to like a nonexistent squeak ', async () => {
    await expect(
      contract.connect(barbie).likeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});

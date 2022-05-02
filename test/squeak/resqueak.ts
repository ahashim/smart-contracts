// libraries
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

describe('Resqueak', () => {
  beforeEach(
    ` Deploy contracts.
      Create accounts for Ahmed & Barbie, but not Carlos.
      Ahmed posts a squeak.`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
      [, ahmed, barbie, carlos] = await ethers.getSigners();
    }
  );

  it('lets a user resqueak a squeak', async () => {
    const ahmedStartingBalance = await ahmed.getBalance();

    // assert treasury is empty
    expect(await contract.treasury()).to.equal(0);

    // barbie resqueaks ahmeds squeak
    const tx = await contract
      .connect(barbie)
      .resqueak(tokenId, { value: PLATFORM_FEE });
    await tx.wait();

    // assert events
    await expect(tx)
      .to.emit(contract, 'Resqueaked')
      .withArgs(barbie.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(treasuryFee)
      .and.to.emit(contract, 'FundsTransferred')
      .withArgs(ahmed.address, transferAmount);

    // ahmed now has funds from barbie via the platform
    expect(await ahmed.getBalance()).to.equal(
      ahmedStartingBalance.add(transferAmount)
    );

    // treasury now has funds from barbie
    expect(await contract.treasury()).to.equal(treasuryFee);
  });

  it('reverts if a user does not have an account', async () => {
    await expect(
      contract.connect(carlos).resqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts if a user does not have enough funds', async () => {
    await expect(contract.connect(barbie).resqueak(tokenId, { value: 1 })).to
      .be.reverted;
  });

  it('reverts if a user tries to like a nonexistent squeak ', async () => {
    await expect(
      contract.connect(barbie).resqueak(420, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});

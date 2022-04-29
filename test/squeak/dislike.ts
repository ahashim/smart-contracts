import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { twoAccountsOneSqueak } from '../fixtures';
import { PLATFORM_FEE } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

let contract: Contract;
let barbie: SignerWithAddress;
let carlos: SignerWithAddress;
let tokenId: number;

describe('Dislike a squeak', () => {
  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie, but not Carlos.
        Ahmed posts a squeak.`,
    async () => {
      [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
      [, , barbie, carlos] = await ethers.getSigners();
    }
  );

  it('lets a user dislike a squeak', async () => {
    // assert squeak has no dislikes & treasury is empty
    expect(await contract.treasury()).to.equal(0);
    expect(await contract.getDislikeCount(tokenId)).to.equal(0);

    // barbie dislikes ahmeds squeak
    const tx = await contract
      .connect(barbie)
      .dislikeSqueak(tokenId, { value: PLATFORM_FEE });
    await tx.wait();

    // assert events
    await expect(tx)
      .to.emit(contract, 'SqueakDisliked')
      .withArgs(barbie.address, tokenId)
      .and.to.emit(contract, 'FeeDeposited')
      .withArgs(PLATFORM_FEE);

    // treasury now has funds from barbie
    expect(await contract.treasury()).to.equal(PLATFORM_FEE);
    expect(await contract.getDislikeCount(tokenId)).to.equal(1);
  });

  it('reverts if a user does not have an account', async () => {
    await expect(
      contract.connect(carlos).dislikeSqueak(tokenId, { value: PLATFORM_FEE })
    ).to.be.revertedWith('Critter: address does not have an account');
  });

  it('reverts if a user does not have enough funds', async () => {
    await expect(
      contract.connect(barbie).dislikeSqueak(tokenId, { value: 1 })
    ).to.be.revertedWith('Critter: not enough funds to perform action');
  });

  it('reverts if a user tries to dislike a nonexistent squeak ', async () => {
    await expect(
      contract.connect(barbie).dislikeSqueak(420, { value: PLATFORM_FEE })
    ).to.be.revertedWith(
      'Critter: cannot perform action on a nonexistent token'
    );
  });
});

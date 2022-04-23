// libraries
import { expect } from 'chai';
import { ethers, run } from 'hardhat';
import { BLOCK_CONFIRMATION_THRESHOLD, FEE_DELETION } from '../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Finance', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;

  beforeEach(async () => {
    contract = await run('deployContract');
    [owner, ahmed, barbie] = await ethers.getSigners();

    // create a single account
    await run('createAccount', {
      contract,
      signer: ahmed,
      username: 'ahmed',
    });
  });

  describe('delete fees', () => {
    it('allows anybody to get a delete fee for a token', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content: 'is this thing on?',
      });
      const { tokenId } = event.args;
      const squeak = await contract.squeaks(tokenId);

      // calculate the fee expected to delete it
      const { number: latestBlockNumber } = await ethers.provider.getBlock(
        'latest'
      );
      const latestBlockThreshold =
        latestBlockNumber + BLOCK_CONFIRMATION_THRESHOLD;
      const expectedFee =
        (latestBlockThreshold - squeak.blockNumber) * FEE_DELETION;

      // barbie does not have a critter account, but is able calculate the
      // delete fee for ahmeds squeak from the contract
      const fee = await contract
        .connect(barbie)
        .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

      // assert expected fee matches the actual delete fee
      expect(fee).to.equal(expectedFee);
    });

    it('reverts when getting delete fees for a nonexistent token', async () => {
      const nonExistentTokenID = 420; // 🌿 hhhehehe
      await expect(
        contract.getDeleteFee(nonExistentTokenID, BLOCK_CONFIRMATION_THRESHOLD)
      ).to.be.revertedWith(
        'Critter: cannot calculate fee for nonexistent token'
      );
    });

    it('deposits deletion fees for the account into the treasury', async () => {
      const ahmedTokens = [];
      const gospelQuotes = [
        'Now THIS is podracing!',
        'Impossible! Perhaps the archives are incomplete.',
      ];

      // assert the treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // ahmed creates a few squeaks
      for (let i = 0; i < gospelQuotes.length; i++) {
        const event = await run('createSqueak', {
          contract,
          signer: ahmed,
          content: gospelQuotes[i],
        });
        ahmedTokens.push(event.args.tokenId.toNumber());
      }

      // assert ahmed owns every squeak
      expect(await contract.balanceOf(ahmed.address)).to.equal(
        ahmedTokens.length
      );

      // calculate the fee & delete the first squeak
      const firstSqueakId = ahmedTokens[0];
      const fee = await contract
        .connect(ahmed)
        .getDeleteFee(firstSqueakId, BLOCK_CONFIRMATION_THRESHOLD);

      // delete the squeak
      await run('deleteSqueak', {
        contract,
        signer: ahmed,
        tokenId: firstSqueakId,
      });

      // assert ahmed only has 1 squeak now
      expect(await contract.balanceOf(ahmed.address)).to.equal(1);

      // assert the treasury received the fee to delete the first queak
      expect(await contract.treasury()).to.equal(fee);
    });

    it('reverts when the user does not pay enough to delete the squeak', async () => {
      // create squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content: 'this is the wei',
      });
      const { tokenId } = event.args;

      // delete squeak tx
      await expect(
        contract.connect(ahmed).deleteSqueak(tokenId, {
          value: 1, // one wei
        })
      ).to.be.revertedWith('Critter: not enough funds to delete squeak');
    });
  });
});

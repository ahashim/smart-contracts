// libraries
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
  BLOCK_CONFIRMATION_THRESHOLD,
  CONTRACT_INITIALIZER,
  FEE_DELETION,
  USERNAME,
} from '../constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Finance', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;
  let ownedTokens: Array<Number>;

  // users
  let owner: SignerWithAddress;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');
    ownedTokens = [];

    // deploy upgradeable contract
    contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    // create account tx
    const createAccountTx = await contract.createAccount(USERNAME);
    await createAccountTx.wait();
  });

  describe('delete fees', () => {
    it('allows anybody to get a delete fee for a token', async () => {
      // post a couple of squeaks
      const firstSqueakTx = await contract.createSqueak('is this thing on?');
      await firstSqueakTx.wait();
      const secondSqueakTx = await contract.createSqueak('oh, why hello!');
      await secondSqueakTx.wait();

      // get the squeak's token ID
      const currentBalance = await contract.balanceOf(owner.address);
      for (let index = 0; index < currentBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenId] = ownedTokens;

      // calculate expectedFee for first token
      const squeak = await contract.squeaks(tokenId);
      const { number: latestBlockNumber } = await ethers.provider.getBlock(
        'latest'
      );
      const latestBlockThreshold =
        latestBlockNumber + BLOCK_CONFIRMATION_THRESHOLD;
      const expectedFee =
        (latestBlockThreshold - squeak.blockNumber) * FEE_DELETION;

      // get delete fee for the first token
      const fee = await contract.getDeleteFee(
        tokenId,
        BLOCK_CONFIRMATION_THRESHOLD
      );

      expect(fee).to.equal(expectedFee);
    });

    it('reverts when getting delete fees for a nonexistent token', async () => {
      const nonExistentTokenID = 9000;
      await expect(
        contract.getDeleteFee(nonExistentTokenID, BLOCK_CONFIRMATION_THRESHOLD)
      ).to.be.revertedWith(
        'Critter: cannot calculate fee for nonexistent token'
      );
    });

    it('deposits deletion fees for the account into the treasury', async () => {
      // post a couple of squeaks
      const firstSqueakTx = await contract.createSqueak('is this thing on?');
      await firstSqueakTx.wait();
      const secondSqueakTx = await contract.createSqueak('oh, why hello!');
      await secondSqueakTx.wait();

      // assert owner has a balance of 2 squeaks
      const currentBalance = await contract.balanceOf(owner.address);
      expect(currentBalance).to.equal(2);

      // get the squeak ID's
      for (let index = 0; index < currentBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenId] = ownedTokens;

      // delete squeak tx
      const fee = await contract.getDeleteFee(
        tokenId,
        BLOCK_CONFIRMATION_THRESHOLD
      );
      const deleteSqueakTx = await contract.deleteSqueak(tokenId, {
        value: fee,
      });
      await deleteSqueakTx.wait();

      // assert owner only has 1 token now
      expect(await contract.balanceOf(owner.address)).to.equal(1);

      // assert the treasury received the fee to delete the first squeak
      expect(await contract.treasury()).to.equal(fee);
    });

    it('reverts when the user does not pay enough to delete the squeak', async () => {
      // create squeak
      const createSqueakTx = await contract.createSqueak('regretful squeak');
      await createSqueakTx.wait();

      // get tokenIDs
      const ownerBalance = await contract.balanceOf(owner.address);
      for (let index = 0; index < ownerBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenId] = ownedTokens;
      const fee = 1; // 1 wei

      // delete squeak tx
      await expect(
        contract.deleteSqueak(tokenId, {
          value: fee,
        })
      ).to.be.revertedWith('Critter: not enough funds to delete squeak');
    });
  });
});

// libraries
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
  BASE_TOKEN_URI,
  BLOCK_CONFIRMATION_THRESHOLD,
  CONTRACT_INITIALIZER,
  HARDHAT_NETWORK_ID,
  USERNAME,
} from '../constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { keccak256, defaultAbiCoder } from 'ethers/lib/utils';

describe('Squeaks', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;
  let ownedTokens: Array<Number>;

  // users
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');
    ownedTokens = [];

    // deploy upgradeable contract
    contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    // create an owner account
    const createAccountTx = await contract.createAccount(USERNAME);
    await createAccountTx.wait();
  });

  describe('create', () => {
    it('creates a squeak from the senders address', async () => {
      const content = 'hello blockchain!';
      const tokenID = 1;

      // post a squeak
      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();

      // retrieve token based on its expected id
      const squeak = await contract.squeaks(tokenID);
      const tokenURI = await contract.tokenURI(tokenID);

      // squeak assertions
      expect(squeak.content).to.equal(content);
      expect(squeak.account).to.equal(owner.address);

      // tokenURI assertion
      const hexURI = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256'],
          [HARDHAT_NETWORK_ID, tokenID]
        )
      ).slice(2); // removing 0x prefix
      const expectedTokenURI = BASE_TOKEN_URI + hexURI;
      expect(tokenURI).to.equal(expectedTokenURI);
    });

    it('reverts when a user tries to post without an account', async () => {
      // assertions
      await expect(
        // trying to create a squeak from ahmed's account who never registered
        contract.connect(ahmed).createSqueak('hello blockchain!')
      ).to.be.revertedWith('Critter: address does not have an accoun');
    });

    it('reverts when the squeak has no content', async () => {
      const emptySqueak = '';

      // assertions
      await expect(contract.createSqueak(emptySqueak)).to.be.revertedWith(
        'Critter: squeak cannot be empty'
      );
    });

    it('reverts when a squeak is too long', async () => {
      const longSqueak = `Did you ever hear the tragedy of Darth Plagueis The Wise?
      I thought not. It’s not a story the Jedi would tell you. It’s a Sith legend.
      Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise he could
      use the Force to influence the midichlorians to create life...`;

      // assertions
      await expect(contract.createSqueak(longSqueak)).to.be.revertedWith(
        'Critter: squeak is too long'
      );
    });
  });

  describe('delete', () => {
    const content = 'hello blockchain!';

    it('allows a user to delete their squeak', async () => {
      // create a squeak
      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();

      // get the squeak ID's
      const currentBalance = await contract.balanceOf(owner.address);
      for (let index = 0; index < currentBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenID] = ownedTokens;

      // assert existence/ownership
      expect(await contract.balanceOf(owner.address)).to.equal(1);
      expect(await contract.ownerOf(tokenID)).to.equal(owner.address);

      // delete the squeak
      const fee = await contract.getDeleteFee(
        tokenID,
        BLOCK_CONFIRMATION_THRESHOLD
      );
      const deleteSqueakTx = await contract.deleteSqueak(tokenID, {
        value: fee,
      });
      await deleteSqueakTx.wait();

      // assert it no longer exists
      expect(await contract.balanceOf(owner.address)).to.equal(0);
      await expect(contract.ownerOf(tokenID)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });

    it('reverts when a user tries to delete a squeak they do not own', async () => {
      // create a squeak
      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();

      // get the squeak ID's
      const currentBalance = await contract.balanceOf(owner.address);
      for (let index = 0; index < currentBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenID] = ownedTokens;

      // new user ahmed
      const createAccountTx = await contract
        .connect(ahmed)
        .createAccount('ahmed');
      await createAccountTx.wait();

      await expect(
        // ahmed trying to delete contract owners squeak
        contract.connect(ahmed).deleteSqueak(tokenID)
      ).to.be.revertedWith('Critter: not approved to delete squeak');
    });
  });

  describe('events', () => {
    it('emits a SqueakCreated event', async () => {
      const eventName = 'SqueakCreated';
      const content = 'General Kenobi! You are a bold one.';
      const tokenID = 1;

      // create squeak
      const tx = await contract.createSqueak(content);

      await expect(tx)
        .to.emit(contract, eventName)
        .withArgs(owner.address, tokenID, tx.blockNumber, content);
    });

    it('emits a SqueakDeleted event', async () => {
      const eventName = 'SqueakDeleted';
      const content = 'Impossible. Perhaps the archives are incomplete.';

      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();

      // get the squeak ID's
      const currentBalance = await contract.balanceOf(owner.address);
      for (let index = 0; index < currentBalance.toNumber(); index++) {
        const tokenId = await contract.tokenOfOwnerByIndex(
          owner.address,
          index
        );
        ownedTokens.push(tokenId.toNumber());
      }
      const [tokenID] = ownedTokens;

      // delete the squeak
      const fee = await contract.getDeleteFee(
        tokenID,
        BLOCK_CONFIRMATION_THRESHOLD
      );
      await expect(contract.deleteSqueak(tokenID, { value: fee }))
        .to.emit(contract, eventName)
        .withArgs(owner.address, tokenID);
    });
  });
});

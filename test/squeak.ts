// libraries
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BASE_TOKEN_URI, NAME, SYMBOL, USERNAME } from './constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Squeaks', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');

    // deploy our contract
    contract = await factory.deploy(NAME, SYMBOL, BASE_TOKEN_URI);

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

      // assertions
      expect(squeak.content).to.equal(content);
      expect(squeak.account).to.equal(owner.address);
      expect(tokenURI).to.equal(BASE_TOKEN_URI + tokenID);
    });

    it('reverts when a user tries to post without an account', async () => {
      // assertions
      await expect(
        // trying to create a squeak from ahmed's account who never registered
        contract.connect(ahmed).createSqueak('hello blockchain!')
      ).to.be.revertedWith('Critter: address does not have an account');
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
    const tokenID = 1;

    beforeEach(async () => {
      // create a squeak
      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();
    });

    it('allows a user to delete their squeak', async () => {
      // assert existence/ownership
      expect(await contract.balanceOf(owner.address)).to.equal(tokenID);
      expect(await contract.ownerOf(tokenID)).to.equal(owner.address);

      // delete the squeak
      const deleteSqueakTx = await contract.deleteSqueak(tokenID);
      await deleteSqueakTx.wait();

      // assert it no longer exists
      expect(await contract.balanceOf(owner.address)).to.equal(0);
      await expect(contract.ownerOf(tokenID)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });

    it('reverts when a user tries to delete a squeak they do not own', async () => {
      // new user ahmed
      const createAccountTx = await contract
        .connect(ahmed)
        .createAccount('ahmed');
      await createAccountTx.wait();

      await expect(
        // ahmed trying to delete contract owners squeak
        contract.connect(ahmed).deleteSqueak(tokenID)
      ).to.be.revertedWith('ERC721Burnable: caller is not owner nor approved');
    });
  });

  describe('events', () => {
    it('emits a SqueakCreated event', async () => {
      const eventName = 'SqueakCreated';
      const content = 'General Kenobi! You are a bold one.';
      const tokenID = 1;

      await expect(contract.createSqueak(content))
        .to.emit(contract, eventName)
        .withArgs(owner.address, tokenID, content);
    });

    it('emits a SqueakDeleted event', async () => {
      const eventName = 'SqueakDeleted';
      const content = 'Impossible. Perhaps the archives are incomplete.';
      const tokenID = 1;

      const createSqueakTx = await contract.createSqueak(content);
      await createSqueakTx.wait();

      await expect(await contract.deleteSqueak(tokenID))
        .to.emit(contract, eventName)
        .withArgs(owner.address, tokenID);
    });
  });
});

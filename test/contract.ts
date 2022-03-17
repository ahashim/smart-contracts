// libraries
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BASE_TOKEN_URI, NAME, SYMBOL, USERNAME } from './constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Contract', () => {
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

  describe('interfaces', () => {
    it('supports the ERCI65 interface', async () => {
      expect(await contract.supportsInterface('0x01ffc9a7')).to.equal(true);
    });

    it('supports the ERC721 interface', async () => {
      expect(await contract.supportsInterface('0x80ac58cd')).to.equal(true);
    });

    it('supports the ERC721Metadata interface', async () => {
      expect(await contract.supportsInterface('0x5b5e139f')).to.equal(true);
    });

    it('supports the ERC721Enumerable interface', async () => {
      expect(await contract.supportsInterface('0x780e9d63')).to.equal(true);
    });
  });

  describe('state', () => {
    it('can be paused & unpaused by a user with the PAUSER_ROLE', async () => {
      // pause the contract from owner account
      const pauseContractTx = await contract.pause();
      await pauseContractTx.wait();

      expect(await contract.paused()).to.equal(true);

      // unpause the contract from the same account
      const unpauseContractTx = await contract.unpause();
      await unpauseContractTx.wait();

      expect(await contract.paused()).to.equal(false);
    });

    it('reverts when a user without a PAUSER_ROLE tries to pause/unpause', async () => {
      await expect(
        // ahmed trying to delete contract owners squeak
        contract.connect(ahmed).pause()
      ).to.be.revertedWith(
        'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a'
      );
    });
  });

  describe('events', () => {
    it('emits a Paused event', async () => {
      const eventName = 'Paused';

      await expect(contract.pause())
        .to.emit(contract, eventName)
        .withArgs(owner.address);
    });

    it('emits an Unpaused event', async () => {
      const eventName = 'Unpaused';

      // first pause contract
      const pauseContractTx = await contract.pause();
      await pauseContractTx.wait();

      await expect(contract.unpause())
        .to.emit(contract, eventName)
        .withArgs(owner.address);
    });
  });
});

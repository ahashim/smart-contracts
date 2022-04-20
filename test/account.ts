// libraries
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { CONTRACT_INITIALIZER, USERNAME } from './constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Accounts', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  // account variables
  const MINTER_ROLE = ethers.utils.id('MINTER_ROLE');
  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');

    // deploy upgradeable contract
    contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);
  });

  describe('create', () => {
    it('creates an account with the users address', async () => {
      // create account tx
      const createAccountTx = await contract.createAccount(USERNAME);
      await createAccountTx.wait();

      // compare username in transaction with account address from the blockchain
      const name = await contract.usernames(owner.address);
      expect(name).to.equal(USERNAME);

      // compare account address in transaction with username from the blockchain
      const address = await contract.addresses(USERNAME);
      expect(address).to.equal(owner.address);
    });

    it('grants a new account the role of MINTER', async () => {
      // contract owner
      const createAccountTx = await contract.createAccount(USERNAME);
      await createAccountTx.wait();

      // another account
      const anotherCreateAccountTx = await contract
        .connect(ahmed)
        .createAccount('ahmed');
      await anotherCreateAccountTx.wait();

      // assert 2 accounts have the role of minter
      expect(await contract.getRoleMemberCount(MINTER_ROLE)).to.equal(2);

      // first account belongs to the owner
      expect(await contract.getRoleMember(MINTER_ROLE, 0)).to.equal(
        owner.address
      );

      // second is a regular user
      expect(await contract.getRoleMember(MINTER_ROLE, 1)).to.equal(
        ahmed.address
      );
    });

    it('reverts when the users address already has an account', async () => {
      // first create account tx
      const firstCreateAccountTx = await contract.createAccount(USERNAME);
      await firstCreateAccountTx.wait();
      // second create account tx from the same address
      await expect(
        contract.createAccount('some-other-name')
      ).to.be.revertedWith('Critter: account already exists');
    });
  });

  describe('update', () => {
    it('updates the username', async () => {
      // create account
      const createAccountTx = await contract.createAccount(USERNAME);
      await createAccountTx.wait();

      // assert we have a username
      expect(await contract.usernames(owner.address)).to.equal(USERNAME);

      // change username
      const newUsername = 'ahashim';
      const changeUsernameTx = await contract.updateUsername(newUsername);
      await changeUsernameTx.wait();

      // assert our username changed
      expect(await contract.usernames(owner.address)).to.equal(newUsername);
    });

    it('makes an old username available when updating to a new one', async () => {
      // contract owner signs up as 'a-rock'
      const createAccountTx = await contract.createAccount(USERNAME);
      await createAccountTx.wait();

      // contract owner updates their username to 'ahashim'
      const updateUsernameTx = await contract.updateUsername('ahashim');
      await updateUsernameTx.wait();

      // another address can now sign up as 'a-rock'
      const anotherCreateAccountTx = await contract
        .connect(ahmed)
        .createAccount(USERNAME);
      await anotherCreateAccountTx.wait();

      // assert our new account has the original username
      expect(await contract.usernames(ahmed.address)).to.equal(USERNAME);
    });

    it('reverts when updating username & the address does not have an account', async () => {
      // second create account tx from a different address but duplicate username
      await expect(
        contract.connect(ahmed).updateUsername('ahmed')
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts when updating username & new the username is already taken', async () => {
      // first create account tx
      const firstCreateAccountTx = await contract.createAccount(USERNAME);
      await firstCreateAccountTx.wait();

      // second create account tx from a different address but duplicate username
      await expect(
        contract.connect(ahmed).createAccount(USERNAME)
      ).to.be.revertedWith('Critter: username taken');
    });

    it('reverts when updating the username & the new username is empty', async () => {
      await expect(contract.createAccount('')).to.be.revertedWith(
        'Critter: username cannot be empty'
      );
    });

    it('reverts when updating the username & the new username is longer than 256 bytes', async () => {
      await expect(
        contract.createAccount('000000000000000000000000000000001')
      ).to.be.revertedWith('Critter: username is too long');
    });
  });

  describe('events', () => {
    it('emits an AccountCreated event', async () => {
      const eventName = 'AccountCreated';

      await expect(contract.createAccount(USERNAME))
        .to.emit(contract, eventName)
        .withArgs(owner.address, USERNAME);
    });

    it('emits a UsernameUpdated event', async () => {
      const eventName = 'UsernameUpdated';
      const newUsername = 'ahmed';

      // first create an account
      const createAccountTx = await contract.createAccount(USERNAME);
      await createAccountTx.wait();

      // then change username
      await expect(contract.updateUsername(newUsername))
        .to.emit(contract, eventName)
        .withArgs(owner.address, USERNAME, newUsername);
    });
  });
});

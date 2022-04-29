// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { freshDeploy, oneAccount } from './fixtures';

describe('Accounts', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;

  // account variables
  const MINTER_ROLE = ethers.utils.id('MINTER_ROLE');

  describe('create', () => {
    beforeEach('Deploy contracts', async () => {
      contract = await waffle.loadFixture(freshDeploy);
      [owner, ahmed] = await ethers.getSigners();
    });

    it('creates an account with the senders address', async () => {
      const username = 'ahmed';

      // create account & assert event
      expect(await contract.connect(ahmed).createAccount(username))
        .to.emit(contract, 'AccountCreated')
        .withArgs(ahmed.address, username);

      // assert address <=> username mapping is correct
      expect(await contract.usernames(ahmed.address)).to.equal(username);
      expect(await contract.addresses(username)).to.equal(ahmed.address);
    });

    it('grants a new account the role of MINTER', async () => {
      const signers = [owner, ahmed];

      // create a single account
      await run('createAccount', {
        contract,
        signer: ahmed,
        username: 'ahmed',
      });

      // assert 2 accounts have the MINTER_ROLE (because the owner is
      // automatically granted the role upon contract deployment)
      expect(await contract.getRoleMemberCount(MINTER_ROLE)).to.equal(
        signers.length
      );

      // assert the index of each role belongs to the accounts created
      for (let i = 0; i < signers.length; i++) {
        expect(await contract.getRoleMember(MINTER_ROLE, i)).to.equal(
          signers[i].address
        );
      }
    });

    it('reverts when the users address already has an account', async () => {
      // first create account tx
      await run('createAccount', {
        contract,
        signer: ahmed,
        username: 'ahmed',
      });

      // second create account tx from the same address
      await expect(
        run('createAccount', {
          contract,
          signer: ahmed,
          username: 'a-rock',
        })
      ).to.be.revertedWith('Critter: account already exists');
    });
  });

  describe('update', () => {
    const username = 'ahmed';
    const newUsername = 'a-rock';

    beforeEach(
      'Deploy contracts, and create an account for Ahmed but not Barbie',
      async () => {
        contract = await waffle.loadFixture(oneAccount);
        [, ahmed, barbie] = await ethers.getSigners();
      }
    );

    it('updates the username', async () => {
      // assert existence of the username
      expect(await contract.usernames(ahmed.address)).to.equal(username);

      // change username & assert the event
      await expect(contract.connect(ahmed).updateUsername(newUsername))
        .to.emit(contract, 'UsernameUpdated')
        .withArgs(ahmed.address, username, newUsername);

      // assert the has username changed
      expect(await contract.usernames(ahmed.address)).to.equal(newUsername);
    });

    it('makes an old username available when an account changes it', async () => {
      // ahmed changes their username
      await run('updateUsername', {
        contract,
        signer: ahmed,
        newUsername,
      });

      // barbie signs up as 'a-rock'
      await run('createAccount', {
        contract,
        signer: barbie,
        username,
      });

      // assert barbie's username is ahmed's original username ('ahmed')
      expect(await contract.usernames(barbie.address)).to.equal(username);
    });

    it('reverts if the address updating the username does not have an account', async () => {
      // barbie tries to update their username without an account
      await expect(
        run('updateUsername', {
          contract,
          signer: barbie,
          newUsername,
        })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts when updating username & new the username is already taken', async () => {
      // barbie attempts to sign up with the same username
      await expect(
        run('createAccount', {
          contract,
          signer: barbie,
          username,
        })
      ).to.be.revertedWith('Critter: username taken');
    });

    it('reverts when updating the username & the new username is empty', async () => {
      await expect(
        run('createAccount', {
          contract,
          signer: ahmed,
          username: '',
        })
      ).to.be.revertedWith('Critter: username cannot be empty');
    });

    it('reverts when updating the username & the new username is longer than 256 bytes', async () => {
      await expect(
        run('createAccount', {
          contract,
          signer: ahmed,
          username:
            'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?',
        })
      ).to.be.revertedWith('Critter: username is too long');
    });
  });
});

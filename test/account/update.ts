// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { oneAccount } from '../fixtures';

describe('Update account', () => {
  let contract: Contract;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;

  // account variables
  const username = 'ahmed';
  const newUsername = 'a-rock';

  beforeEach(
    ` Deploy contracts.
      Create accounts for Ahmed & Barbie`,
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
    ).to.be.reverted;
  });

  it('reverts when updating username & new the username is already taken', async () => {
    // barbie attempts to sign up with the same username
    await expect(
      run('createAccount', {
        contract,
        signer: barbie,
        username,
      })
    ).to.be.reverted;
  });

  it('reverts when updating the username & the new username is empty', async () => {
    await expect(
      run('createAccount', {
        contract,
        signer: ahmed,
        username: '',
      })
    ).to.be.reverted;
  });

  it('reverts when updating the username & the new username is longer than 256 bytes', async () => {
    await expect(
      run('createAccount', {
        contract,
        signer: ahmed,
        username:
          'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?',
      })
    ).to.be.reverted;
  });
});

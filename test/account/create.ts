// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { freshDeploy } from '../fixtures';

describe('Create account', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  // account variables
  const MINTER_ROLE = ethers.utils.id('MINTER_ROLE');

  beforeEach('Deploy contracts.', async () => {
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

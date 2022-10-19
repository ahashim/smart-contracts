import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Status } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { ContractTransaction } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateUsername', () => {
  const longUsername =
    'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?';
  const oldUsername = 'ahmed';
  const newUsername = 'a-rock';

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const updateUsernameFixture = async () => {
    [owner, ahmed, barbie, carlos] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount(oldUsername);

    // ahmed updates their username
    tx = await critter.updateUsername(newUsername);

    // barbie creates an account with ahmeds old username
    await critter.connect(barbie).createAccount(oldUsername);

    return {
      critter,
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(updateUsernameFixture));
  });

  it('lets a user create an account with a valid username', async () => {
    expect((await critter.users(ahmed.address)).username).to.eq(newUsername);
    expect(await critter.addresses(newUsername)).to.eq(ahmed.address);
  });

  it('makes the old username available when updating to a new one', async () => {
    expect((await critter.users(barbie.address)).username).to.eq(oldUsername);
    expect(await critter.addresses(oldUsername)).to.eq(barbie.address);
  });

  it('emits an AccountUsernameUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountUsernameUpdated')
      .withArgs(ahmed.address, newUsername);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.updateUsername('')).to.be.revertedWithCustomError(
      critter,
      'UsernameEmpty'
    );
  });

  it('reverts when the username is too long', async () => {
    await expect(
      critter.updateUsername(longUsername)
    ).to.be.revertedWithCustomError(critter, 'UsernameTooLong');
  });

  it('reverts when the address already has an account', async () => {
    await expect(
      critter.updateUsername('a-rock')
    ).to.be.revertedWithCustomError(critter, 'UsernameUnavailable');
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(carlos).updateUsername('ahmed')
    ).to.be.revertedWithCustomError(critter, 'InvalidAccount');
  });

  it('reverts when the account status is not active', async () => {
    // ban ahmed
    await critter.connect(owner).updateStatus(ahmed.address, Status.Banned);

    await expect(
      critter.updateUsername('ahmed')
    ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });
});

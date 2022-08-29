import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { AccountStatus } from '../enums';

describe('updateUsername', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let tx: ContractTransaction;

  // test variables
  const longUsername =
    'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?';
  const oldUsername = 'ahmed';
  const newUsername = 'a-rock';

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const updateUsernameFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account & updates their username
    await critter.createAccount(oldUsername);
    tx = await critter.updateUsername(newUsername);

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
    await critter.connect(owner).createAccount(oldUsername);

    expect((await critter.users(owner.address)).username).to.eq(oldUsername);
    expect(await critter.addresses(oldUsername)).to.eq(owner.address);
  });

  it('emits an AccountUsernameUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountUsernameUpdated')
      .withArgs(ahmed.address, newUsername);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.updateUsername('')).to.be.reverted;
  });

  it('reverts when the username is too long', async () => {
    await expect(critter.updateUsername(longUsername)).to.be.reverted;
  });

  it('reverts when the address already has an account', async () => {
    await expect(critter.updateUsername('a-rock')).to.be.reverted;
  });

  it('reverts when the account is not active', async () => {
    // ban ahmed
    await critter
      .connect(owner)
      .updateAccountStatus(ahmed.address, AccountStatus.Banned);

    await expect(critter.updateUsername('ahmed')).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    // pause the contract
    await critter.connect(owner).pause();
    await expect(critter.updateUsername(newUsername)).to.be.reverted;
  });
});

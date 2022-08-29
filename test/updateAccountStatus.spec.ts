import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { AccountStatus } from '../enums';

// types
import { ContractTransaction, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('updateAccountStatus', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const updateAccountStatusFixture = async () => {
    // deploy contract as owner
    critter = (await run('deploy-contract')).connect(owner);

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // moderator suspends ahmed & barbie, then bans carlos (harsh!)
    await critter.updateAccountStatus(ahmed.address, AccountStatus.Suspended);
    await critter.updateAccountStatus(barbie.address, AccountStatus.Suspended);
    await critter.updateAccountStatus(carlos.address, AccountStatus.Banned);

    // they reactivate ahmeds account (phew!)
    tx = await critter
      .connect(owner)
      .updateAccountStatus(ahmed.address, AccountStatus.Active);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(updateAccountStatusFixture));
  });

  it('updates a users account status to active', async () => {
    expect((await critter.users(ahmed.address)).status).to.eq(
      AccountStatus.Active
    );
  });

  it('updates a users account status to suspended', async () => {
    expect((await critter.users(barbie.address)).status).to.eq(
      AccountStatus.Suspended
    );
  });

  it('updates a users account status to banned', async () => {
    expect((await critter.users(carlos.address)).status).to.eq(
      AccountStatus.Banned
    );
  });

  it('emits an AccountStatusUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountStatusUpdated')
      .withArgs(ahmed.address, AccountStatus.Active);
  });

  it('reverts when trying to update a users account status to non-existent', async () => {
    await expect(
      critter.updateAccountStatus(ahmed.address, AccountStatus.NonExistent)
    ).to.be.reverted;
  });

  it('reverts when trying to update a users account status to its already current status', async () => {
    await expect(
      critter.updateAccountStatus(ahmed.address, AccountStatus.Active)
    ).to.be.reverted;
  });

  it('reverts when users account does not exist', async () => {
    await expect(
      critter.updateAccountStatus(owner.address, AccountStatus.Banned)
    ).to.be.reverted;
  });
});

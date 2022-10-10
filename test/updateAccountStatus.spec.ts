import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { Status } from '../enums';

// types
import { ContractTransaction, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('updateStatus', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const updateStatusFixture = async () => {
    // deploy contract as owner
    critter = (await run('deploy-contract')).connect(owner);

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // moderator suspends ahmed & barbie, then bans carlos (harsh!)
    await critter.updateStatus(ahmed.address, Status.Suspended);
    await critter.updateStatus(barbie.address, Status.Suspended);
    await critter.updateStatus(carlos.address, Status.Banned);

    // they reactivate ahmeds account (phew!)
    tx = await critter
      .connect(owner)
      .updateStatus(ahmed.address, Status.Active);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(updateStatusFixture));
  });

  it('updates a users account status to active', async () => {
    expect((await critter.users(ahmed.address)).status).to.eq(
      Status.Active
    );
  });

  it('updates a users account status to suspended', async () => {
    expect((await critter.users(barbie.address)).status).to.eq(
      Status.Suspended
    );
  });

  it('updates a users account status to banned', async () => {
    expect((await critter.users(carlos.address)).status).to.eq(
      Status.Banned
    );
  });

  it('emits an StatusUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'StatusUpdated')
      .withArgs(ahmed.address, Status.Active);
  });

  it('reverts when trying to update a users account status to unknown', async () => {
    await expect(
      critter.updateStatus(ahmed.address, Status.Unknown)
    ).to.be.reverted;
  });

  it('reverts when trying to update a users account status to its already current status', async () => {
    await expect(
      critter.updateStatus(ahmed.address, Status.Active)
    ).to.be.reverted;
  });

  it('reverts when users account does not exist', async () => {
    await expect(
      critter.updateStatus(owner.address, Status.Banned)
    ).to.be.reverted;
  });
});

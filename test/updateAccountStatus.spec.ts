import { ethers, expect, loadFixture, run } from './setup';
import { MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';
import type {
  ContractTransaction,
  Critter,
  SignerWithAddress,
} from '../types';

describe('updateStatus', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const updateStatusFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
    critter = await run('deploy-contract');

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
    expect((await critter.users(ahmed.address)).status).to.eq(Status.Active);
  });

  it('updates a users account status to suspended', async () => {
    expect((await critter.users(barbie.address)).status).to.eq(
      Status.Suspended
    );
  });

  it('updates a users account status to banned', async () => {
    expect((await critter.users(carlos.address)).status).to.eq(Status.Banned);
  });

  it('emits an StatusUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'StatusUpdated')
      .withArgs(ahmed.address, Status.Active);
  });

  it('reverts when trying to update a users account status to unknown', async () => {
    await expect(
      critter.updateStatus(ahmed.address, Status.Unknown)
    ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });

  it('reverts when trying to update a users account status to its already current status', async () => {
    await expect(
      critter.updateStatus(ahmed.address, Status.Active)
    ).to.be.to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });

  it('reverts when users account does not exist', async () => {
    await expect(
      critter.updateStatus(owner.address, Status.Banned)
    ).to.be.to.be.revertedWithCustomError(critter, 'InvalidAccount');
  });

  it('reverts when someone other than the moderator tries to update a users account status', async () => {
    await expect(
      critter.connect(ahmed).updateStatus(barbie.address, Status.Unknown)
    ).to.be.revertedWith(
      `AccessControl: account ${ahmed.address.toLowerCase()} is missing role ${MODERATOR_ROLE}`
    );
  });
});

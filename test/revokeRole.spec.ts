import { MINTER_ROLE } from '../constants';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('revokeRole', () => {
  let critter: Critter;
  let ahmed: SignerWithAddress, barbie: SignerWithAddress;

  // test variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);

  const revokeRoleFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    const critter = (await run('deploy-contracts')).critter;

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // owner revokes ahmed's minter role
    await critter.revokeRole(ID_MINTER_ROLE, ahmed.address);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(revokeRoleFixture);
  });

  it('lets a role-admin revoke a users role', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.false;
  });

  it('reverts if a user other than the role-admin tries to revoke a role', async () => {
    await expect(
      critter.connect(ahmed).revokeRole(ID_MINTER_ROLE, barbie.address)
    ).to.be.revertedWith(
      `AccessControl: account ${ahmed.address.toLowerCase()} is missing role ${
        ethers.constants.HashZero
      }`
    );
  });
});

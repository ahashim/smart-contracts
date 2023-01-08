import { OPERATOR_ROLE, TREASURER_ROLE } from '../constants';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('revokeRole', () => {
  let critter: Critter;
  let ahmed: SignerWithAddress, owner: SignerWithAddress;

  const revokeRoleFixture = async () => {
    [owner, ahmed] = await ethers.getSigners();
    ({ critter } = await run('initialize-contracts'));

    // owner revokes his operator role
    await critter.revokeRole(OPERATOR_ROLE, owner.address);

    return { ahmed, critter, owner };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ ahmed, critter, owner } = await loadFixture(revokeRoleFixture));
  });

  it('lets a role-admin revoke a users role', async () => {
    expect(await critter.hasRole(OPERATOR_ROLE, owner.address)).to.be.false;
  });

  it('reverts if a user other than the role-admin tries to revoke a role', async () => {
    await expect(
      critter.connect(ahmed).revokeRole(TREASURER_ROLE, owner.address)
    ).to.be.revertedWith(
      `AccessControl: account ${ahmed.address.toLowerCase()} is missing role ${
        ethers.constants.HashZero
      }`
    );
  });
});

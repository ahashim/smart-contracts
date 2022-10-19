import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { MINTER_ROLE } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('revokeRole', () => {
  let critter: Critter;
  let ahmed: SignerWithAddress, barbie: SignerWithAddress;

  // test variables
  const ID_MINTER_ROLE = hardhat.ethers.utils.id(MINTER_ROLE);

  const revokeRoleFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    const critter = await hardhat.run('deploy-contract');

    // everybody creates an account
    await hardhat.run('create-accounts', {
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
        hardhat.ethers.constants.HashZero
      }`
    );
  });
});

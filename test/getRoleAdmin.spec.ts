import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { MINTER_ROLE, TREASURER_ROLE, UPGRADER_ROLE } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('getRoleAdmin', () => {
  const ID_MINTER_ROLE = hardhat.ethers.utils.id(MINTER_ROLE);
  const ID_TREASURER_ROLE = hardhat.ethers.utils.id(TREASURER_ROLE);
  const ID_UPGRADER_ROLE = hardhat.ethers.utils.id(UPGRADER_ROLE);

  let critter: Critter;
  let owner: SignerWithAddress;
  let roleAdmins: {
    [key: string]: string;
  };

  const getRoleAdminFixture = async () => {
    critter = await hardhat.run('deploy-contract');

    return {
      critter,
      roleAdmins: {
        minter: await critter.getRoleAdmin(ID_MINTER_ROLE),
        treasurer: await critter.getRoleAdmin(ID_TREASURER_ROLE),
        upgrader: await critter.getRoleAdmin(ID_UPGRADER_ROLE),
      },
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    [owner] = await hardhat.ethers.getSigners();
    ({ critter, roleAdmins } = await loadFixture(getRoleAdminFixture));
  });

  it('sets the owner account as the role-admin for the MINTER_ROLE', async () => {
    expect(await critter.hasRole(roleAdmins.minter, owner.address)).to.be.true;
  });

  it('sets the owner account as the role-admin for the TREASURER_ROLE', async () => {
    expect(await critter.hasRole(roleAdmins.treasurer, owner.address)).to.be
      .true;
  });

  it('sets the owner account as the role-admin for the UPGRADER_ROLE', async () => {
    expect(await critter.hasRole(roleAdmins.upgrader, owner.address)).to.be
      .true;
  });
});

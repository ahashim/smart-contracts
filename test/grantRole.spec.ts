import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { TREASURER_ROLE } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('grantRole', () => {
  const ID_TREASURER_ROLE = hardhat.ethers.utils.id(TREASURER_ROLE);
  let ahmed: SignerWithAddress, critter: Critter;

  const grantRoleFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    critter = await hardhat.run('deploy-contract');

    // granting ahmed the treasurer role
    await critter.grantRole(ID_TREASURER_ROLE, ahmed.address);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(grantRoleFixture);
  });

  it('lets the role admin grant a role to an address', async () => {
    expect(await critter.hasRole(ID_TREASURER_ROLE, ahmed.address)).to.be.true;
  });
});

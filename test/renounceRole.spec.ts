import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { MINTER_ROLE, UPGRADER_ROLE } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ContractTransaction } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('renounceRole', () => {
  const ID_MINTER_ROLE = hardhat.ethers.utils.id(MINTER_ROLE);
  const ID_UPGRADER_ROLE = hardhat.ethers.utils.id(UPGRADER_ROLE);

  let ahmed: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const renounceRoleFixture = async () => {
    [owner, ahmed] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed renounces the minter role
    tx = await critter.renounceRole(ID_MINTER_ROLE, ahmed.address);

    return { critter, tx };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account that gives him MINTER_ROLE access',
    async () => {
      ({ critter, tx } = await loadFixture(renounceRoleFixture));
    }
  );

  it('lets a user to renounce any roles they might have', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.false;
  });

  it('emits a RoleRevoked event', async () => {
    await expect(tx)
      .to.emit(critter, 'RoleRevoked')
      .withArgs(ID_MINTER_ROLE, ahmed.address, ahmed.address);
  });

  it('reverts when trying to renounce another users role', async () => {
    await expect(
      critter.renounceRole(ID_UPGRADER_ROLE, owner.address)
    ).to.be.revertedWith('AccessControl: can only renounce roles for self');
  });
});

import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { MINTER_ROLE } from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('revokeRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  // test variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const revokeRoleFixture = async () => {
    // deploy contract
    const critter = await run('deploy-contract');

    // everybody creates an account
    await run('create-accounts', {
      accounts: [owner, ahmed],
      contract: critter,
    });

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(revokeRoleFixture);
  });

  it('lets a role-admin revoke a users role', async () => {
    await critter.revokeRole(ID_MINTER_ROLE, ahmed.address);

    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.false;
  });

  it('reverts if a user other than the role-admin tries to revoke a role', async () => {
    await expect(
      critter.connect(ahmed).revokeRole(ID_MINTER_ROLE, ahmed.address)
    ).to.be.reverted;
  });
});

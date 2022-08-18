import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  MINTER_ROLE,
} from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('revokeRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const revokeRoleFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
    await critter.createAccount('ahmed');

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account that gives him MINTER_ROLE access',
    async () => {
      critter = await loadFixture(revokeRoleFixture);
    }
  );

  // test variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);

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

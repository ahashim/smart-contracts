import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  MINTER_ROLE,
  PAUSER_ROLE,
} from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('renounceRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const renounceRoleFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;
    await critter.createAccount('ahmed');

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account that gives him MINTER_ROLE access',
    async () => {
      critter = await loadFixture(renounceRoleFixture);
    }
  );

  // test variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_PAUSER_ROLE = ethers.utils.id(PAUSER_ROLE);

  it('lets a user to renounce any roles they might have', async () => {
    await critter.renounceRole(ID_MINTER_ROLE, ahmed.address);
    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.false;
  });

  it('emits a RoleRevoked event', async () => {
    await expect(critter.renounceRole(ID_MINTER_ROLE, ahmed.address))
      .to.emit(critter, 'RoleRevoked')
      .withArgs(ID_MINTER_ROLE, ahmed.address, ahmed.address);
  });

  it('reverts when trying to renounce another users role', async () => {
    await expect(critter.renounceRole(ID_PAUSER_ROLE, owner.address)).to.be
      .reverted;
  });
});

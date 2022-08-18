import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  MINTER_ROLE,
  PAUSER_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('roles', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const rolesFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;
    await critter.createAccount('ahmed');

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account',
    async () => {
      critter = await loadFixture(rolesFixture);
    }
  );

  // test variables
  const ID_DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_PAUSER_ROLE = ethers.utils.id(PAUSER_ROLE);
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);
  const ID_UPGRADER_ROLE = ethers.utils.id(UPGRADER_ROLE);

  it('grants the contract owner the DEFAULT_ADMIN_ROLE', async () => {
    expect(await critter.hasRole(ID_DEFAULT_ADMIN_ROLE, owner.address)).to.be
      .true;
  });

  it('grants the contract owner the MINTER_ROLE', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the PAUSER_ROLE', async () => {
    expect(await critter.hasRole(ID_PAUSER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the TREASURER_ROLE', async () => {
    expect(await critter.hasRole(ID_TREASURER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the UPGRADER_ROLE', async () => {
    expect(await critter.hasRole(ID_UPGRADER_ROLE, owner.address)).to.be.true;
  });

  it('grants every new account the MINTER_ROLE', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.true;
  });
});

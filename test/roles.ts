import { Wallet } from 'ethers';
import { ethers, waffle, upgrades } from 'hardhat';
import { expect } from 'chai';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  MINTER_ROLE,
  PAUSER_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';
import { Critter } from '../typechain-types/contracts';

describe('roles', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const rolesFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    return critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(rolesFixture);
  });

  // test variables
  const ID_DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_PAUSER_ROLE = ethers.utils.id(PAUSER_ROLE);
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);
  const ID_UPGRADER_ROLE = ethers.utils.id(UPGRADER_ROLE);

  it('initializes the DEFAULT_ADMIN_ROLE', async () => {
    expect(await critter.DEFAULT_ADMIN_ROLE()).to.eq(ID_DEFAULT_ADMIN_ROLE);
  });

  it('initializes the MINTER_ROLE', async () => {
    expect(await critter.MINTER_ROLE()).to.eq(ID_MINTER_ROLE);
  });

  it('initializes the PAUSER_ROLE', async () => {
    expect(await critter.PAUSER_ROLE()).to.eq(ID_PAUSER_ROLE);
  });

  it('initializes the TREASURER_ROLE', async () => {
    expect(await critter.TREASURER_ROLE()).to.eq(ID_TREASURER_ROLE);
  });

  it('initializes the UPGRADER_ROLE', async () => {
    expect(await critter.UPGRADER_ROLE()).to.eq(ID_UPGRADER_ROLE);
  });
});

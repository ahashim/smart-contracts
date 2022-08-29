import { Wallet } from 'ethers';
import { ethers, run, waffle } from 'hardhat';
import { expect } from 'chai';
import {
  MINTER_ROLE,
  PAUSER_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';
import { Critter } from '../typechain-types/contracts';

describe('getRoleAdmin', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;
  let roleAdmin: string;

  // tests variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_PAUSER_ROLE = ethers.utils.id(PAUSER_ROLE);
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);
  const ID_UPGRADER_ROLE = ethers.utils.id(UPGRADER_ROLE);

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const getRoleAdminFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(getRoleAdminFixture);
  });

  it('sets the owner account as the role-admin for the MINTER_ROLE', async () => {
    roleAdmin = await critter.getRoleAdmin(ID_MINTER_ROLE);
    expect(await critter.hasRole(roleAdmin, owner.address)).to.be.true;
  });

  it('sets the owner account as the role-admin for the PAUSER_ROLE', async () => {
    roleAdmin = await critter.getRoleAdmin(ID_PAUSER_ROLE);
    expect(await critter.hasRole(roleAdmin, owner.address)).to.be.true;
  });

  it('sets the owner account as the role-admin for the TREASURER_ROLE', async () => {
    roleAdmin = await critter.getRoleAdmin(ID_TREASURER_ROLE);
    expect(await critter.hasRole(roleAdmin, owner.address)).to.be.true;
  });

  it('sets the owner account as the role-admin for the UPGRADER_ROLE', async () => {
    roleAdmin = await critter.getRoleAdmin(ID_UPGRADER_ROLE);
    expect(await critter.hasRole(roleAdmin, owner.address)).to.be.true;
  });
});

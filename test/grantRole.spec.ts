import { Wallet } from 'ethers';
import { ethers, upgrades, waffle } from 'hardhat';
import { expect } from 'chai';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  TREASURER_ROLE,
} from '../constants';
import { Critter } from '../typechain-types/contracts';

describe('grantRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const grantRoleFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(grantRoleFixture);
  });

  // tests variables
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);

  it('lets the role admin grant a role to an address', async () => {
    await critter.grantRole(ID_TREASURER_ROLE, ahmed.address);
    expect(await critter.hasRole(ID_TREASURER_ROLE, ahmed.address)).to.be.true;
  });
});

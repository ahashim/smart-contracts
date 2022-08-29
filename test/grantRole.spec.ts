import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { TREASURER_ROLE } from '../constants';

// types
import { Critter } from '../typechain-types/contracts';
import { Wallet } from 'ethers';

describe.only('grantRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  // tests variables
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const grantRoleFixture = async () => {
    critter = await run('deploy-contract');

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

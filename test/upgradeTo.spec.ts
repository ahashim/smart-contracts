import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { ContractFactory, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('upgradeTo', () => {
  let critter: Critter;
  let factory: ContractFactory;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const upgradeToFixture = async () => {
    const factory = (await ethers.getContractFactory(
      CONTRACT_NAME
    )) as ContractFactory;
    const critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    return { critter, factory };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, factory } = await loadFixture(upgradeToFixture));
  });

  it('upgrades the contract', async () => {
    const critterUpgraded = await upgrades.upgradeProxy(
      critter.address,
      factory
    );
    expect(critter.address).to.equal(critterUpgraded.address);
  });

  it('reverts when upgrading to an account that does not support UUPS', async () => {
    await expect(critter.upgradeTo(critter.address)).to.be.reverted;
  });

  it('reverts when upgrading to a non-contract account', async () => {
    await expect(critter.upgradeTo(ethers.constants.AddressZero)).to.be
      .reverted;
  });
});

import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';
import type {
  Contract,
  ContractFactory,
  Critter,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, upgrades } from './setup';

describe('upgradeTo', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    factory: ContractFactory,
    upgradedContract: Contract;

  const upgradeToFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    // owner upgrades the contract
    upgradedContract = await upgrades.upgradeProxy(critter.address, factory);

    return { critter, factory, upgradedContract };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, factory, upgradedContract } = await loadFixture(
      upgradeToFixture
    ));
  });

  it('upgrades the contract', () => {
    expect(upgradedContract.address).to.equal(critter.address);
  });

  it('reverts when upgrading to an account that does not support UUPS', async () => {
    await expect(critter.upgradeTo(critter.address)).to.be.revertedWith(
      'ERC1967Upgrade: new implementation is not UUPS'
    );
  });

  it('reverts when upgrading to a non-contract account', async () => {
    await expect(critter.upgradeTo(ahmed.address)).to.be.reverted;
  });
});

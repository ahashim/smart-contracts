import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { ContractFactory, Contract } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('upgradeTo', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    factory: ContractFactory,
    upgradedContract: Contract;

  const upgradeToFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    factory = await hardhat.ethers.getContractFactory(CONTRACT_NAME);
    critter = (await hardhat.upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    // owner upgrades the contract
    upgradedContract = await hardhat.upgrades.upgradeProxy(
      critter.address,
      factory
    );

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

// libraries
import { expect } from 'chai';
import { ethers, run, upgrades } from 'hardhat';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Contract upgrades', () => {
  let contract: Contract;
  let ahmed: SignerWithAddress;

  beforeEach('Deploy contracts.', async () => {
    contract = await run('deployContract');
    [, ahmed] = await ethers.getSigners();
  });

  it('upgrades the contract', async () => {
    // upgrade the contract
    const factory = await ethers.getContractFactory('Critter');
    const contractV2 = await upgrades.upgradeProxy(contract.address, factory);

    // assert UUPS proxy address is the same as the old contract
    expect(contract.address).to.equal(contractV2.address);
  });

  it('reverts when a user without an UPGRADER_ROLE tries to upgrade', async () => {
    const upgradeAddress = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

    await expect(
      // ahmed trying to upgrade the contract w/o an UPGRADER_ROLE
      contract.connect(ahmed).upgradeTo(upgradeAddress)
    ).to.be.revertedWith(
      'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'
    );
  });
});

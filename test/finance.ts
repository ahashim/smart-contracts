// libraries
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { CONTRACT_INITIALIZER, FEE_REGISTRATION, USERNAME } from './constants';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Finance', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let owner: SignerWithAddress;

  // account variables
  const txOptions = {
    value: FEE_REGISTRATION,
  };

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');

    // deploy upgradeable contract
    contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);
  });

  describe('registration', () => {
    it('deposits registration fees for the account into the treasury', async () => {
      // create account tx
      const createAccountTx = await contract.createAccount(
        USERNAME,
        txOptions
      );
      await createAccountTx.wait();

      // compare accounts treasury value with registration fees
      const amount = await contract.treasury(owner.address);
      expect(amount).to.equal(FEE_REGISTRATION);
    });

    it('reverts when the user does not have enough to cover the registration fee', async () => {
      // create account tx with only 1 wei
      await expect(
        contract.createAccount('this-is-the-wei', { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to create an account');
    });
  });
});

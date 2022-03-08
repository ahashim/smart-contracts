// libraries
import { expect } from 'chai';
import { ethers } from 'hardhat';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Contract', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let ahmed: SignerWithAddress;

  // account variables
  const USERNAME = 'a-rock';

  beforeEach(async () => {
    [, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');

    // deploy our contract
    contract = await factory.deploy(
      'Critter', // name
      'CRTR', // symbol
      'https://critter.fyi/token/' // baseURL
    );

    // create an owner account
    const createAccountTx = await contract.createAccount(USERNAME);
    await createAccountTx.wait();
  });

  describe('state', () => {
    it('can be paused & unpaused by a user with the PAUSER_ROLE', async () => {
      // pause the contract
      const pauseContractTx = await contract.pause();
      await pauseContractTx.wait();

      expect(await contract.paused()).to.equal(true);

      // unpause the contract
      const unpauseContractTx = await contract.unpause();
      await unpauseContractTx.wait();

      expect(await contract.paused()).to.equal(false);
    });

    it('reverts when a user without a PAUSER_ROLE tries to pause/unpause', async () => {
      await expect(
        // ahmed trying to delete contract owners squeak
        contract.connect(ahmed).pause()
      ).to.be.revertedWith('Critter: must have pauser role to pause');
    });
  });
});

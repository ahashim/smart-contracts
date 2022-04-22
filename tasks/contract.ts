import { task } from 'hardhat/config';
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

// types
import type { Contract, ContractFactory, ContractTransaction } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TransactionReceipt } from '@ethersproject/providers';

task(
  'createAccount',
  'creates a single Critter account',
  async ({
    contract,
    signer,
    username,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    username: string;
  }): Promise<TransactionReceipt> => {
    const tx: ContractTransaction = await contract
      .connect(signer)
      .createAccount(username);
    const transactionReceipt: TransactionReceipt = await tx.wait();

    return transactionReceipt;
  }
);

task(
  'deployContract',
  'Deploys upgradeable contracts via a proxy from owner account',
  async (_, { ethers, upgrades }): Promise<Contract> => {
    // deploy contract
    const factory: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME
    );
    const contract: Contract = await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    );

    return contract;
  }
);

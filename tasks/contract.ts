import { task } from 'hardhat/config';

// constants
import {
  BLOCK_CONFIRMATION_THRESHOLD,
  CONTRACT_INITIALIZER,
  CONTRACT_NAME,
} from '../constants';

// types
import type { Contract, ContractFactory, ContractTransaction } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TransactionReceipt } from '@ethersproject/providers';
import type { Event } from '@ethersproject/providers/lib/base-provider';

task(
  'createAccount',
  'Create & confirm a signed createAccount transaction',
  async ({
    contract,
    signer,
    username,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    username: string;
  }): Promise<TransactionReceipt> => {
    // create account tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .createAccount(username);

    // wait for a confirmation
    return await tx.wait();
  }
);

task(
  'deployContract',
  'Deploys contracts via an upgradeable proxy from the owner EOA',
  async (_, { ethers, upgrades }): Promise<Contract> => {
    // get contract factory instance
    const factory: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME
    );

    // deploy contract via upgradeable proxy
    return await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);
  }
);

task(
  'createSqueak',
  'Create & confirm a signed squeak transaction',
  async ({
    contract,
    signer,
    content,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    content: string;
  }) => {
    // create squeak tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .createSqueak(content);

    // wait for a confirmation
    const receipt = await tx.wait();

    // return event data
    return receipt.events!.find(({ event }) => event === 'SqueakCreated');
  }
);

task(
  'deleteSqueak',
  'Create & confirm a signed delete squeak transaction',
  async ({
    contract,
    signer,
    tokenId,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    tokenId: number;
  }): Promise<TransactionReceipt> => {
    // get delete fee tx (view function, so no need to wait)
    const fee = await contract.getDeleteFee(
      tokenId,
      BLOCK_CONFIRMATION_THRESHOLD
    );

    // delete the token w/ fee amount
    const tx: ContractTransaction = await contract
      .connect(signer)
      .deleteSqueak(tokenId, { value: fee });

    // wait for a confirmation
    return await tx.wait();
  }
);

task(
  'updateUsername',
  'Create & confirm a signed updateUsername transaction',
  async ({
    contract,
    signer,
    newUsername,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    newUsername: string;
  }): Promise<TransactionReceipt> => {
    // update username tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .updateUsername(newUsername);

    // wait for a confirmation
    return await tx.wait();
  }
);

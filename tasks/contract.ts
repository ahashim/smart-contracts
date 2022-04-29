import { task } from 'hardhat/config';

// constants
import {
  BLOCK_CONFIRMATION_THRESHOLD,
  CONTRACT_INITIALIZER,
  CONTRACT_NAME,
  PLATFORM_FEE,
} from '../constants';

// types
import type { Contract, ContractFactory, ContractTransaction } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TransactionReceipt } from '@ethersproject/providers';

// tasks
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
    // get delete fee tx (in the current block, so no waiting)
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
  'dislikeSqueak',
  'Create & confirm a signed dislike squeak transaction',
  async ({
    contract,
    signer,
    tokenId,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    tokenId: number;
  }): Promise<TransactionReceipt> => {
    // delete the token w/ fee amount
    const tx: ContractTransaction = await contract
      .connect(signer)
      .dislikeSqueak(tokenId, { value: PLATFORM_FEE });

    // wait for a confirmation
    return await tx.wait();
  }
);

task(
  'likeSqueak',
  'Create & confirm a signed like squeak transaction',
  async ({
    contract,
    signer,
    tokenId,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    tokenId: number;
  }): Promise<TransactionReceipt> => {
    // delete the token w/ fee amount
    const tx: ContractTransaction = await contract
      .connect(signer)
      .likeSqueak(tokenId, { value: PLATFORM_FEE });

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

task(
  'undoLike',
  'Create & confirm a signed undoLikeSqueak transaction',
  async ({
    contract,
    signer,
    tokenId,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    tokenId: number;
  }): Promise<TransactionReceipt> => {
    // undo like tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .undoLikeSqueak(tokenId);

    // wait for a confirmation
    return await tx.wait();
  }
);

task(
  'undoDislike',
  'Create & confirm a signed undoDislikeSqueak transaction',
  async ({
    contract,
    signer,
    tokenId,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    tokenId: number;
  }): Promise<TransactionReceipt> => {
    // undo like tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .undoDislikeSqueak(tokenId);

    // wait for a confirmation
    return await tx.wait();
  }
);

import { task } from 'hardhat/config';

// constants
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

// types
import type { Contract, ContractFactory, ContractTransaction } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

// tasks
task(
  'deploy-contract',
  'Deploys contracts via an upgradeable proxy from the owner EOA',
  async (_, { ethers, upgrades }): Promise<Critter> => {
    // get contract factory instance
    const factory: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME
    );

    // deploy contract via upgradeable proxy
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  }
);

task(
  'create-squeak',
  'Create a signed squeak transaction',
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

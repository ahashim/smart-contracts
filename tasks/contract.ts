import { task } from 'hardhat/config';

// constants
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

// types
import type {
  BigNumber,
  Contract,
  ContractFactory,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';
import { Result } from '@ethersproject/abi';

// tasks
task(
  'create-accounts',
  'Create a signed squeak transaction',
  async ({
    accounts,
    contract,
  }: {
    contract: Contract;
    accounts: Wallet[];
  }): Promise<void> => {
    accounts.forEach(async (account, index) => {
      await contract.connect(account).createAccount(index.toString());
    });
  }
);

task(
  'create-squeak',
  'Create a signed squeak transaction',
  async ({
    content,
    contract,
    signer,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    content: string;
  }): Promise<BigNumber> => {
    // create squeak tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .createSqueak(content);

    // wait for confirmation
    const receipt: ContractReceipt = await tx.wait();

    // parse event data for the tokenId
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    const { tokenId } = event!.args as Result;

    return tokenId;
  }
);

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

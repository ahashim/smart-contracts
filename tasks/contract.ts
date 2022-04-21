import { subtask, task } from 'hardhat/config';
import { faker } from '@faker-js/faker';
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

// types
import type { Contract, ContractTransaction } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// default values
const NUMBER_OF_SIGNERS = 20;
const NUMBER_OF_ACCOUNTS = 3;

subtask(
  'createAccount',
  'Creates a single Critter account',
  async ({
    contract,
    signer,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
  }) => {
    // create account tx
    const createAccountTx: ContractTransaction = await contract
      .connect(signer)
      .createAccount(faker.name.firstName());
    await createAccountTx.wait();
  }
);

subtask(
  'deployContract',
  'Deploys upgradeable contracts via a proxy',
  async (_, { ethers, upgrades }) => {
    // deploy contract
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    return contract;
  }
);

subtask(
  'getSigners',
  'Gets an array of signer accounts of a specified amount',
  async ({ amount = NUMBER_OF_SIGNERS }: { amount: number }, { ethers }) => {
    const signers: Array<SignerWithAddress> = await ethers.getSigners();

    return amount === NUMBER_OF_SIGNERS ? signers : signers.slice(0, amount);
  }
);

task(
  'initialize',
  'Deploys contracts and sets up 1 owner + 2 regular accounts',
  async ({ numberOfAccounts = NUMBER_OF_ACCOUNTS }, { run }) => {
    const contract: Contract = await run('deployContract');
    const signers: Array<SignerWithAddress> = await run('getSigners', {
      amount: numberOfAccounts,
    });

    signers.forEach(async (signer) => {
      await run('createAccount', { contract, signer });
    });

    // return contract + signers
    return [contract, signers];
  }
);

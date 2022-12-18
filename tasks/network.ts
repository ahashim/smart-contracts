import { task } from 'hardhat/config';

import {
  BASE_TOKEN_URI,
  BONUS,
  CONTRACT_NAME,
  MAX_LEVEL,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
} from '../constants';
import type {
  Contract,
  ContractFactory,
  ContractInitializer,
  ContractInitializerOverrides,
} from '../types';

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  'blockNumber',
  'Prints the current block number',
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log('Current block number: ' + blockNumber);
    });
  }
);

task(
  'deploy-contract',
  'Deploys contracts via an upgradeable proxy from the owner EOA',
  async (
    overrides: ContractInitializerOverrides,
    { ethers, upgrades }
  ): Promise<Contract> => {
    const initializer: ContractInitializer = [];
    const defaults = {
      dividendThreshold: {
        value: POOL_THRESHOLD,
        index: 0,
      },
      viralityThreshold: {
        value: VIRALITY_THRESHOLD,
        index: 1,
      },
      maxLevel: {
        value: MAX_LEVEL,
        index: 2,
      },
    };

    // narrow type declaration of the override keys when iterating over them
    let key: keyof typeof defaults;

    // check for overrides
    if (Object.keys(overrides || {}).length) {
      for (key in overrides) {
        defaults[key].value = overrides[key];
      }
    }

    // build contract constructor
    for (key in defaults) {
      initializer[defaults[key].index] = defaults[key].value;
    }

    // get contract factory instance
    const factory: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME
    );

    // deploy contract via upgradeable proxy
    return (await upgrades.deployProxy(factory, initializer)) as Contract;
  }
);

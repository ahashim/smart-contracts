import { task } from 'hardhat/config';

import {
  BASE_TOKEN_URI,
  BONUS,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
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
      name: {
        value: CONTRACT_NAME,
        index: 0,
      },
      symbol: {
        value: CONTRACT_SYMBOL,
        index: 1,
      },
      baseTokenURI: {
        value: BASE_TOKEN_URI,
        index: 2,
      },
      platformFee: {
        value: PLATFORM_FEE,
        index: 3,
      },
      takeRate: {
        value: PLATFORM_TAKE_RATE,
        index: 4,
      },
      PoolThreshold: {
        value: POOL_THRESHOLD,
        index: 5,
      },
      viralityThreshold: {
        value: VIRALITY_THRESHOLD,
        index: 6,
      },
      bonus: {
        value: BONUS,
        index: 7,
      },
      maxLevel: {
        value: MAX_LEVEL,
        index: 8,
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
      defaults.name.value
    );

    // deploy contract via upgradeable proxy
    return (await upgrades.deployProxy(factory, initializer)) as Contract;
  }
);

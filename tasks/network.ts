import { subtask, task } from 'hardhat/config';

import {
  CONTRACT_NAME,
  DIVIDEND_THRESHOLD,
  LIB_VIRALITY_SCORE,
  MAX_LEVEL,
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
    { ethers, run, upgrades }
  ): Promise<Contract> => {
    const initializer: ContractInitializer = [];
    const defaults = {
      dividendThreshold: {
        value: DIVIDEND_THRESHOLD,
        index: 0,
      },
      maxLevel: {
        value: MAX_LEVEL,
        index: 1,
      },
      viralityThreshold: {
        value: VIRALITY_THRESHOLD,
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

    // deploy ViralityScore library
    const libViralityScore: Contract = await run('deploy-library');

    // get contract factory instance
    const critter: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME,
      {
        libraries: {
          ViralityScore: libViralityScore.address,
        },
      }
    );

    // deploy contract via upgradeable proxy
    return (await upgrades.deployProxy(critter, initializer, {
      unsafeAllow: ['external-library-linking'],
    })) as Contract;
  }
);

subtask(
  'deploy-library',
  'Deploys libraries required by the smart contract',
  async (_, { ethers }): Promise<Contract> => {
    // get virality score library factory instance
    const viralityScore: ContractFactory = await ethers.getContractFactory(
      LIB_VIRALITY_SCORE
    );

    // deploy
    const libViralityScore = await viralityScore.deploy();
    await libViralityScore.deployed();

    return libViralityScore;
  }
);

import { subtask, task } from 'hardhat/config';

import {
  CONTRACT_NAME,
  DIVIDEND_THRESHOLD,
  LIB_VALIDATION,
  LIB_VIRALITY_SCORE,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
} from '../constants';
import type {
  Contract,
  ContractFactory,
  ContractInitializer,
  ContractInitializerOverrides,
  CritterContracts,
  LibraryContracts,
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
  'deploy-contracts',
  'Deploys contracts via an upgradeable proxy from the owner EOA',
  async (
    overrides: ContractInitializerOverrides,
    { ethers, run, upgrades }
  ): Promise<CritterContracts> => {
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
    const { libValidation, libViralityScore } = await run('deploy-libraries');

    // get contract factory instance
    const critter: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME,
      {
        libraries: {
          Validation: libValidation.address,
          ViralityScore: libViralityScore.address,
        },
      }
    );

    // deploy contract via upgradeable proxy
    return {
      critter: (await upgrades.deployProxy(critter, initializer, {
        // necessary due to linking contracts to an UUPS proxy
        unsafeAllow: ['external-library-linking'],
      })) as Contract,
      libraries: {
        libValidation,
        libViralityScore,
      },
    };
  }
);

subtask(
  'deploy-libraries',
  'Deploys libraries required by the main contract',
  async (_, { ethers }): Promise<LibraryContracts> => {
    const validation: ContractFactory = await ethers.getContractFactory(
      LIB_VALIDATION
    );
    const viralityScore: ContractFactory = await ethers.getContractFactory(
      LIB_VIRALITY_SCORE
    );

    // deploy
    return {
      libValidation: await validation.deploy(),
      libViralityScore: await viralityScore.deploy(),
    };
  }
);

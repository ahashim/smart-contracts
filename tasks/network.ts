/* eslint-disable camelcase */
import { subtask, task } from 'hardhat/config';

import {
  CONTRACT_NAME,
  DIVIDEND_THRESHOLD,
  LIB_ACCOUNTABLE,
  LIB_BANKABLE,
  LIB_RELATABLE,
  LIB_SQUEAKABLE,
  LIB_VIRALITY_SCORE,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
} from '../constants';
import {
  Accountable__factory,
  Bankable__factory,
  Relatable__factory,
  Squeakable__factory,
  ViralityScore__factory,
} from '../typechain-types';
import type {
  ContractFactory,
  ContractInitializer,
  ContractInitializerOverrides,
  Critter,
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
    const {
      libAccountable,
      libBankable,
      libRelatable,
      libSqueakable,
      libViralityScore,
    } = await run('deploy-libraries');

    // get contract factory instance
    const critter: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME,
      {
        libraries: {
          Accountable: libAccountable.address,
          Bankable: libBankable.address,
          Relatable: libRelatable.address,
          Squeakable: libSqueakable.address,
          ViralityScore: libViralityScore.address,
        },
      }
    );

    // deploy contract via upgradeable proxy
    return {
      critter: (await upgrades.deployProxy(critter, initializer, {
        // necessary due to linking contracts to an UUPS proxy
        unsafeAllow: ['external-library-linking'],
      })) as Critter,
      libraries: {
        libAccountable,
        libBankable,
        libRelatable,
        libSqueakable,
        libViralityScore,
      },
    };
  }
);

subtask(
  'deploy-libraries',
  'Deploys libraries required by the main contract',
  async (_, { ethers }): Promise<LibraryContracts> => {
    const accountable: Accountable__factory = await ethers.getContractFactory(
      LIB_ACCOUNTABLE
    );
    const bankable: Bankable__factory = await ethers.getContractFactory(
      LIB_BANKABLE
    );
    const relatable: Relatable__factory = await ethers.getContractFactory(
      LIB_RELATABLE
    );
    const squeakable: Squeakable__factory = await ethers.getContractFactory(
      LIB_SQUEAKABLE
    );
    const viralityScore: ViralityScore__factory =
      await ethers.getContractFactory(LIB_VIRALITY_SCORE);

    // deploy
    return {
      libAccountable: await accountable.deploy(),
      libBankable: await bankable.deploy(),
      libRelatable: await relatable.deploy(),
      libSqueakable: await squeakable.deploy(),
      libViralityScore: await viralityScore.deploy(),
    };
  }
);

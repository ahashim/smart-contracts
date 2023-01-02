/* eslint-disable camelcase */
import { subtask, task } from 'hardhat/config';

import {
  CONTRACT_CRITTER,
  CONTRACT_TOKEN,
  DIVIDEND_THRESHOLD,
  LIB_ACCOUNTABLE,
  LIB_BANKABLE,
  LIB_VIRAL,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
} from '../constants';
import type {
  Accountable__factory,
  Bankable__factory,
  Contract,
  ContractFactory,
  ContractInitializer,
  ContractInitializerOverrides,
  Critter,
  CritterContracts,
  LibraryContracts,
  Token__factory,
  Viral__factory,
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

subtask(
  'deploy-critter-contract',
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

    // build contract initializer
    for (key in defaults) {
      initializer[defaults[key].index] = defaults[key].value;
    }

    // deploy libraries
    const { libAccountable, libBankable, libViral } = await run(
      'deploy-libraries'
    );

    // get contract factory instance
    const critter: ContractFactory = await ethers.getContractFactory(
      CONTRACT_CRITTER,
      {
        libraries: {
          Accountable: libAccountable.address,
          Bankable: libBankable.address,
          Viral: libViral.address,
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
        libViral,
      },
    };
  }
);

subtask(
  'deploy-token-contract',
  'Deploys the ERC721 Token contract',
  async (critterAddress: string, { ethers, upgrades }): Promise<Contract> => {
    const tokenFactory: Token__factory = await ethers.getContractFactory(
      CONTRACT_TOKEN
    );
    return await upgrades.deployProxy(tokenFactory, [critterAddress]);
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
    const viral: Viral__factory = await ethers.getContractFactory(LIB_VIRAL);

    // deploy
    return {
      libAccountable: await accountable.deploy(),
      libBankable: await bankable.deploy(),
      libViral: await viral.deploy(),
    };
  }
);

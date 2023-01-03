/* eslint-disable camelcase */
import { subtask, task } from 'hardhat/config';

import {
  CONTRACT_CRITTER,
  CONTRACT_SQUEAKABLE,
  DIVIDEND_THRESHOLD,
  LIB_ACCOUNTABLE,
  LIB_BANKABLE,
  LIB_VIRAL,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
} from '../constants';
import type {
  Accountable__factory,
  AllContracts,
  Bankable__factory,
  Contract,
  ContractFactory,
  ContractInitializer,
  ContractInitializerOverrides,
  Critter,
  CritterContracts,
  LibraryContracts,
  Token,
  Token__factory,
  Viral__factory,
} from '../types';

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

    // link contract factory instance with libraries
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

    // deploy via UUPS proxy
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
  'deploy-squeakable-contract',
  'Deploys the ERC721 Token contract',
  async ({ critterAddress }, { ethers, upgrades }): Promise<Contract> => {
    const tokenFactory: Token__factory = await ethers.getContractFactory(
      CONTRACT_SQUEAKABLE
    );

    // deploy via UUPS proxy & initialize it to link to the critter contract
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

task(
  'initialize-contracts',
  'Deploys all upgradeable contracts from the owner EOA',
  async (
    overrides: ContractInitializerOverrides,
    { run }
  ): Promise<AllContracts> => {
    const { critter, libraries }: CritterContracts = await run(
      'deploy-critter-contract',
      overrides
    );
    const tokenContract: Token = await run('deploy-squeakable-contract', {
      critterAddress: critter.address,
    });

    return {
      contracts: {
        critter,
        token: tokenContract,
      },
      libraries,
    };
  }
);

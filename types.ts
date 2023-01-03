/* eslint-disable camelcase */
// imports
import type { BigNumber } from 'ethers';

import { Status } from './enums';
import type {
  Accountable,
  Bankable,
  Critter,
  Squeakable,
  Viral,
} from './typechain-types';

// exports
export type {
  Accountable__factory,
  Bankable__factory,
  Critter,
  Critter__factory,
  Squeakable,
  Squeakable__factory,
  Viral__factory,
} from './typechain-types';
export type { Result } from '@ethersproject/abi';
export type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
export type {
  BigNumber,
  Contract,
  ContractFactory,
  ContractReceipt,
  ContractTransaction,
  Event,
} from 'ethers';

export type BigNumberObject = {
  [key: string]: BigNumber;
};

export type Config = {
  deleteRate: BigNumber;
  platformTakeRate: BigNumber;
  dividendThreshold: BigNumber;
  maxLevel: BigNumber;
  viralityBonus: BigNumber;
  viralityThreshold: BigNumber;
};

export type ContractInitializerOverrides = {
  dividendThreshold: BigNumber;
  maxLevel: number;
  viralityThreshold: number;
};

export type ContractInitializer = (string | number | BigNumber)[];

export type LibraryContracts = {
  libAccountable: Accountable;
  libBankable: Bankable;
  libViral: Viral;
};

export type CritterContracts = {
  critter: Critter;
  libraries: LibraryContracts;
};

export type AllContracts = {
  contracts: {
    critter: Critter;
    squeakable: Squeakable;
  };
  libraries: LibraryContracts;
};

export type PoolInfo = {
  amount: BigNumber;
  shares: BigNumber;
  passCount: BigNumber;
  blockNumber: BigNumber;
  score: BigNumber;
};

export type PoolPassInfo = {
  account: string;
  shares: BigNumber;
};

export type RelationshipCounts = {
  followers: BigNumber;
  following: BigNumber;
};

export type SentimentCounts = {
  dislikes: BigNumber;
  likes: BigNumber;
  resqueaks: BigNumber;
};

export type Squeak = {
  blockNumber: BigNumber;
  author: string;
  owner: string;
  content: string;
};

export type User = {
  account: string;
  status: Status;
  level: BigNumber;
  username: string;
};

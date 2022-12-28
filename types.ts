// imports
import type { BigNumber } from 'ethers';

import { Status } from './enums';
import type { Critter } from './typechain-types/contracts';
import type {
  Accountable,
  Bankable,
  Relatable,
  Squeakable,
  ViralityScore,
} from './typechain-types/contracts/libraries';

// exports
export type { Critter } from './typechain-types/contracts';
export type {
  Accountable,
  Bankable,
  Relatable,
  Squeakable,
  ViralityScore,
} from './typechain-types/contracts/libraries';
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
  libRelatable: Relatable;
  libSqueakable: Squeakable;
  libViralityScore: ViralityScore;
};

export type CritterContracts = {
  critter: Critter;
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

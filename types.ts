// imports
import type { BigNumber } from 'ethers';

import { Status } from './enums';

// exports
export type { Critter } from './typechain-types/contracts';
export type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
export type {
  BigNumber,
  Contract,
  ContractFactory,
  ContractReceipt,
  ContractTransaction,
} from 'ethers';

export type BigNumberObject = {
  [key: string]: BigNumber;
};

export type Config = {
  platformTakeRate: BigNumber;
  poolPayoutThreshold: BigNumber;
  maxLevel: BigNumber;
  viralityBonus: BigNumber;
  viralityThreshold: BigNumber;
};

export type ContractInitializerOverrides = {
  name: string;
  symbol: string;
  baseTokenURI: string;
  platformFee: BigNumber;
  takeRate: number;
  PoolThreshold: BigNumber;
  viralityThreshold: number;
  bonus: number;
  maxLevel: number;
};

export type ContractInitializer = (string | number | BigNumber)[];

export type PoolInfo = {
  amount: BigNumber;
  shares: BigNumber;
  memberCount: BigNumber;
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

export type Scout = {
  account: string;
  shares: BigNumber;
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
  scoutLevel: BigNumber;
  username: string;
};

// imports
import { Status } from './enums';
import type { BigNumber } from 'ethers';

// exports
export type {
  BigNumber,
  Contract,
  ContractFactory,
  ContractReceipt,
  ContractTransaction,
} from 'ethers';
export type { Critter } from './typechain-types/contracts';
export type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export type BigNumberObject = {
  [key: string]: BigNumber;
};

export type Config = {
  platformTakeRate: BigNumber;
  poolPayoutThreshold: BigNumber;
  scoutMaxLevel: BigNumber;
  scoutViralityBonus: BigNumber;
  viralityThreshold: BigNumber;
};

export type ContractInitializerOverrides = {
  name: string;
  symbol: string;
  baseTokenURI: string;
  platformFee: BigNumber;
  takeRate: number;
  scoutPoolThreshold: BigNumber;
  viralityThreshold: number;
  scoutBonus: number;
  scoutMaxLevel: number;
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

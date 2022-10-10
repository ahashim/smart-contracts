import { BigNumber } from 'ethers';
import { Status } from './enums';

export type BigNumberObject = {
  [key: string]: BigNumber;
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

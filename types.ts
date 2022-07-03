import { BigNumber } from 'ethers';
import { AccountStatus } from './constants';

export type BigNumberObject = {
  [key: string]: BigNumber;
};

export type PoolInfo = {
  amount: BigNumber;
  shares: BigNumber;
  memberCount: BigNumber;
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
  status: AccountStatus;
  scoutLevel: BigNumber;
  username: string;
};

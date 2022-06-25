import { BigNumber } from 'ethers';
import { AccountStatus } from './constants';

export type ScoutPool = {
  amount: BigNumber;
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

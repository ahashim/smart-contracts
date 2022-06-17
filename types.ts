import { BigNumber } from 'ethers';

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
  scoutLevel: BigNumber;
  username: string;
};

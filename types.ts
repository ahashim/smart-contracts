import { BigNumber } from 'ethers';

export type Squeak = {
  blockNumber: BigNumber;
  author: string;
  owner: string;
  content: string;
};

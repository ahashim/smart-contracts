import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { CONTRACT_SYMBOL } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';

describe('symbol', () => {
  let critter: Critter, symbol: string;

  const symbolFixture = async () => {
    critter = await hardhat.run('deploy-contract');

    return await critter.symbol();
  };

  beforeEach('load deployed contract fixture', async () => {
    symbol = await loadFixture(symbolFixture);
  });

  it('returns the contract symbol', () => {
    expect(symbol).to.eq(CONTRACT_SYMBOL);
  });
});

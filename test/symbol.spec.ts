import { expect, loadFixture, run } from './setup';
import { CONTRACT_SYMBOL } from '../constants';
import type { Critter } from '../types';

describe('symbol', () => {
  let critter: Critter, symbol: string;

  const symbolFixture = async () => {
    critter = await run('deploy-contract');

    return await critter.symbol();
  };

  beforeEach('load deployed contract fixture', async () => {
    symbol = await loadFixture(symbolFixture);
  });

  it('returns the contract symbol', () => {
    expect(symbol).to.eq(CONTRACT_SYMBOL);
  });
});

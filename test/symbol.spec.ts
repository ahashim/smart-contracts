import { CRITTER_SYMBOL } from '../constants';
import { expect, loadFixture, run } from './setup';

describe('symbol', () => {
  let symbol: string;

  const symbolFixture = async () => {
    return await (await run('deploy-contracts')).critter.symbol();
  };

  beforeEach('load deployed contract fixture', async () => {
    symbol = await loadFixture(symbolFixture);
  });

  it('returns the contract symbol', () => {
    expect(symbol).to.eq(CRITTER_SYMBOL);
  });
});

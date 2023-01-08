import { CRITTER_SYMBOL } from '../constants';
import { expect, run } from './setup';

describe('symbol', () => {
  it('returns the contract symbol', async () => {
    const { squeakable } = await run('initialize-contracts');

    expect(await squeakable.symbol()).to.eq(CRITTER_SYMBOL);
  });
});

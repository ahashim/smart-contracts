import { CONTRACT_CRITTER } from '../constants';
import { expect, run } from './setup';

describe('name', () => {
  it('returns the contract name', async () => {
    const { squeakable } = await run('initialize-contracts');

    expect(await squeakable.name()).to.eq(CONTRACT_CRITTER);
  });
});

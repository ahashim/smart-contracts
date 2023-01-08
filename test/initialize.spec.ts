import {
  DIVIDEND_THRESHOLD,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
} from '../constants';
import type { Critter } from '../types';
import { expect, run } from './setup';

describe('initialize', () => {
  let critter: Critter;

  it('reverts when trying to initialize the contract more than once', async () => {
    ({ critter } = await run('initialize-contracts'));

    await expect(
      critter.initialize(DIVIDEND_THRESHOLD, MAX_LEVEL, VIRALITY_THRESHOLD)
    ).to.be.reverted;
  });
});

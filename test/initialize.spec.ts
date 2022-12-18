import { MAX_LEVEL, POOL_THRESHOLD, VIRALITY_THRESHOLD } from '../constants';
import type { Critter } from '../types';
import { expect, loadFixture, run } from './setup';

describe('initialize', () => {
  let critter: Critter;

  const initializeFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(initializeFixture);
  });

  it('reverts when trying to initialize the contract more than once', async () => {
    await expect(
      critter.initialize(POOL_THRESHOLD, VIRALITY_THRESHOLD, MAX_LEVEL)
    ).to.be.reverted;
  });
});

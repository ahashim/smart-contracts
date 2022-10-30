import {
  BASE_TOKEN_URI,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  BONUS,
  MAX_LEVEL,
  POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
} from '../constants';
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
      critter.initialize(
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        POOL_THRESHOLD,
        VIRALITY_THRESHOLD,
        BONUS,
        MAX_LEVEL
      )
    ).to.be.reverted;
  });
});

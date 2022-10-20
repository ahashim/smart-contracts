import { expect, loadFixture, run } from './setup';
import { BASE_TOKEN_URI } from '../constants';
import type { Critter } from '../types';

describe('baseTokenURI', () => {
  let critter: Critter;

  const baseTokenURIFixture = async () => await run('deploy-contract');

  it('returns the base token URI', async () => {
    critter = await loadFixture(baseTokenURIFixture);
    expect(await critter.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});

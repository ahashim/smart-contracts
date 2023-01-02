import { BASE_TOKEN_URI } from '../constants';
import type { Critter } from '../types';
import { expect, loadFixture, run } from './setup';

describe('baseTokenURI', () => {
  let critter: Critter;

  const baseTokenURIFixture = async () =>
    (await run('deploy-critter-contract')).critter;

  it('returns the base token URI', async () => {
    critter = await loadFixture(baseTokenURIFixture);
    expect(await critter.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});

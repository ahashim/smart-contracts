import { expect, loadFixture, run } from './setup';
import { CONTRACT_NAME } from '../constants';
import type { Critter } from '../types';

describe('name', () => {
  let critter: Critter;

  const nameFixture = async () => await run('deploy-contract');

  before('load deployed contract fixture', async () => {
    critter = await loadFixture(nameFixture);
  });

  it('returns the contract name', async () => {
    expect(await critter.name()).to.eq(CONTRACT_NAME);
  });
});

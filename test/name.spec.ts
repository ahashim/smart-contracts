import { CONTRACT_CRITTER } from '../constants';
import type { Critter } from '../types';
import { expect, loadFixture, run } from './setup';

describe('name', () => {
  let critter: Critter;

  const nameFixture = async () =>
    (await run('initialize-contracts')).contracts.critter;

  before('load deployed contract fixture', async () => {
    critter = await loadFixture(nameFixture);
  });

  it('returns the contract name', async () => {
    expect(await critter.name()).to.eq(CONTRACT_CRITTER);
  });
});

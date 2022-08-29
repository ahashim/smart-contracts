import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { PLATFORM_FEE } from '../constants';

// types
import type { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';
import { Interaction } from '../enums';

describe.only('fees', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const feesFixture = async () => await run('deploy-contract');

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(feesFixture);
  });

  it('gets the base delete fee', async () => {
    expect(await critter.fees(Interaction.Delete)).to.eq(PLATFORM_FEE);
  });

  it('gets the dislike fee', async () => {
    expect(await critter.fees(Interaction.Dislike)).to.eq(PLATFORM_FEE);
  });

  it('gets the like fee', async () => {
    expect(await critter.fees(Interaction.Like)).to.eq(PLATFORM_FEE);
  });

  it('gets the resqueak fee', async () => {
    expect(await critter.fees(Interaction.Resqueak)).to.eq(PLATFORM_FEE);
  });

  it('gets the undo dislike fee', async () => {
    expect(await critter.fees(Interaction.UndoDislike)).to.eq(PLATFORM_FEE);
  });

  it('gets the undo like fee', async () => {
    expect(await critter.fees(Interaction.UndoLike)).to.eq(PLATFORM_FEE);
  });

  it('gets the undo resqueak fee', async () => {
    expect(await critter.fees(Interaction.UndoResqueak)).to.eq(PLATFORM_FEE);
  });
});

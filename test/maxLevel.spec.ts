import { Interaction } from '../enums';
import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('maxLevel', () => {
  const maxLevel = 2;
  const viralityThreshold = 1;

  let critter: Critter;
  let ahmed: SignerWithAddress;
  let level: BigNumber, squeakId: BigNumber;

  const maxLevelFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    // deploy contract with a lower virality threshold to test max level
    ({ critter } = await run('initialize-contracts', {
      viralityThreshold,
      maxLevel,
    }));

    // ahmed creates an account
    await critter.connect(ahmed).createAccount('ahmed');

    // ahmed creates a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: ahmed,
      squeakId,
    });

    // ahmed resqueaks it into virality
    await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: ahmed,
      squeakId,
    });

    return {
      critter,
      level: (await critter.users(ahmed.address)).level,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, level } = await loadFixture(maxLevelFixture));
  });

  it('does not level up a past max level', () => {
    // ahmed propelled the squeak to virality, so they get a level-up bonus of
    // 3, however max level prevents them from getting there
    expect(level).to.eq(maxLevel);
  });

  it('stays at max level when discovering a new viral squeak', async () => {
    // ahmed creates another squeak
    const { squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    });

    // ahmed likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: ahmed,
      squeakId,
    });

    // ahmed resqueaks it into virality
    await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: ahmed,
      squeakId,
    });

    expect((await critter.users(ahmed.address)).level).to.eq(maxLevel);
  });
});

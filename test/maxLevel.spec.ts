import { Interaction } from '../enums';
import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('maxLevel', () => {
  const maxLevel = 2;
  const viralityThreshold = 1;

  let critter: Critter;
  let ahmed: SignerWithAddress;
  let level: BigNumber, squeakId: BigNumber;

  const scoutMaxlevelFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    // deploy contract with a lower virality threshold to test scout max level
    critter = (
      await run('deploy-contract', {
        viralityThreshold,
        maxLevel,
      })
    ).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

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
    ({ critter, level } = await loadFixture(scoutMaxlevelFixture));
  });

  it('does not level up a scout past max level', () => {
    // ahmed propelled the squeak to virality, so they get a scout bonus level
    // up of 3, however max level prevents them from getting there
    expect(level).to.eq(maxLevel);
  });

  it('stays at max level when scouting new viral squeaks', async () => {
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

    expect((await critter.users(ahmed.address)).level).to.eq(
      maxLevel
    );
  });
});

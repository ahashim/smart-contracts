import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { Interaction } from '../enums';

// types
import { BigNumber, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('scoutMaxLevel', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let scoutLevel: BigNumber, squeakId: BigNumber;

  // test variablse
  const scoutMaxLevel = 2;
  const viralityThreshold = 1;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const scoutMaxlevelFixture = async () => {
    // deploy contract with a lower virality threshold to test scout max level
    critter = (
      await run('deploy-contract', {
        viralityThreshold,
        scoutMaxLevel,
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
      scoutLevel: (await critter.users(ahmed.address)).scoutLevel,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, scoutLevel } = await loadFixture(scoutMaxlevelFixture));
  });

  it('does not level up a scout past max level', async () => {
    // ahmed propelled the squeak to virality, so they get a scout bonus level
    // up of 3, however max level prevents them from getting there
    expect(scoutLevel).to.eq(scoutMaxLevel);
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

    expect((await critter.users(ahmed.address)).scoutLevel).to.eq(
      scoutMaxLevel
    );
  });
});

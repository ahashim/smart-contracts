import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe.only('scoutMaxLevel', () => {
  const scoutMaxLevel = 2;
  const viralityThreshold = 1;

  let critter: Critter;
  let ahmed: SignerWithAddress;
  let scoutLevel: BigNumber, squeakId: BigNumber;

  const scoutMaxlevelFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    // deploy contract with a lower virality threshold to test scout max level
    critter = (
      await hardhat.run('deploy-contract', {
        viralityThreshold,
        scoutMaxLevel,
      })
    ).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed likes it
    await hardhat.run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: ahmed,
      squeakId,
    });

    // ahmed resqueaks it into virality
    await hardhat.run('interact', {
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
    const { squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    });

    // ahmed likes it
    await hardhat.run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: ahmed,
      squeakId,
    });

    // ahmed resqueaks it into virality
    await hardhat.run('interact', {
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

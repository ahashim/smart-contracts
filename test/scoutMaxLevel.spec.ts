import { ethers, upgrades, waffle } from 'hardhat';
import { expect } from 'chai';
import {
  BASE_TOKEN_URI,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  SCOUT_BONUS,
  INTERACTION,
} from '../constants';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import { Critter } from '../typechain-types/contracts';

describe('scoutMaxLevel', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let scoutLevel: BigNumber;

  // test variablse
  const scoutMaxLevel = 2;
  const viralityThreshold = 1;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const scoutMaxlevelFixture = async () => {
    // deploy contract with a lower virality threshold to test scout max level
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        SCOUT_POOL_THRESHOLD,
        viralityThreshold,
        SCOUT_BONUS,
        scoutMaxLevel,
      ])
    ).connect(ahmed) as Critter;

    // ahmed creates an account & posts a squeak
    await critter.createAccount('ahmed');
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    const { tokenId: squeakId } = event!.args as Result;

    // ahmed likes & resqueaks it into virality
    await critter.interact(squeakId, INTERACTION.Like, {
      value: await critter.getInteractionFee(INTERACTION.Like),
    });
    await critter.interact(squeakId, INTERACTION.Resqueak, {
      value: await critter.getInteractionFee(INTERACTION.Resqueak),
    });

    return {
      critter,
      scoutLevel: (await critter.users(ahmed.address)).scoutLevel,
    };
  };

  beforeEach('deploy test contract', async () => {
    ({ critter, scoutLevel } = await loadFixture(scoutMaxlevelFixture));
  });

  it('returns the scoutMaxLevel', async () => {
    expect(await critter.scoutMaxLevel()).to.eq(scoutMaxLevel);
  });

  it('does not level up a scout past max level', async () => {
    // ahmed propelled the squeak to virality, so they get a scout bonus level
    // up of 3, however max level prevents them from getting there
    expect(scoutLevel).to.eq(scoutMaxLevel);
  });
});

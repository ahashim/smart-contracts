import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  BLOCK_CONFIRMATION_THRESHOLD,
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
} from '../constants';

// types
import { BigNumber, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('totalSupply', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeaks: string[];

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const totalSupplyFixture = async () => {
    const squeaks = [
      'Now THIS is podracing!',
      'I hate sand 😤',
      'Hello there!',
      'A surpise to be sure, but a welcome one.',
    ];

    // deploy contract
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // ahmed creates an account & posts a few squeaks
    await critter.createAccount('ahmed');
    squeaks.forEach(async (content) => await critter.createSqueak(content));

    // ahmed burns the first created squeak at tokenId 0
    const tokenId = 0;
    const deleteFee = (await critter.getDeleteFee(
      tokenId,
      BLOCK_CONFIRMATION_THRESHOLD
    )) as BigNumber;
    await critter.deleteSqueak(tokenId, { value: deleteFee });

    return { critter, squeaks };
  };

  beforeEach('deploy test contract, and ahmed creates a squeak', async () => {
    ({ critter, squeaks } = await loadFixture(totalSupplyFixture));
  });

  it('returns the number of squeaks currently in circulation (not including burned)', async () => {
    expect(await critter.totalSupply()).to.eq(squeaks.length - 1);
  });
});

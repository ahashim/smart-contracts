import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('totalSupply', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  // test variables
  const squeaks = [
    'Now THIS is podracing!',
    'I hate sand 😤',
    'Hello there!',
    'A surpise to be sure, but a welcome one.',
  ];

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const totalSupplyFixture = async () => {
    // deploy contract
    const critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a few squeaks
    squeaks.forEach(async (content) => await critter.createSqueak(content));

    // ahmed burns the first created squeak at tokenId 0
    await run('delete-squeak', {
      contract: critter,
      signer: ahmed,
      squeakId: 0,
    });

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates a squeak',
    async () => {
      critter = await loadFixture(totalSupplyFixture);
    }
  );

  it('returns the number of squeaks currently in circulation (not including burned)', async () => {
    expect(await critter.totalSupply()).to.eq(squeaks.length - 1);
  });
});

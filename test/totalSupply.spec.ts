import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('totalSupply', () => {
  let ahmed: SignerWithAddress, critter: Critter;

  // test variables
  const squeaks = [
    'Now THIS is podracing!',
    'I hate sand 😤',
    'Hello there!',
    'A surpise to be sure, but a welcome one.',
  ];

  const totalSupplyFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    const critter = (await run('deploy-contracts')).critter.connect(ahmed);

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

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(totalSupplyFixture);
  });

  it('returns the number of unburned squeaks in circulation', async () => {
    expect(await critter.totalSupply()).to.eq(squeaks.length - 1);
  });
});

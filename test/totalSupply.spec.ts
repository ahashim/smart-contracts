import type { Critter, SignerWithAddress, Squeakable } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('totalSupply', () => {
  let ahmed: SignerWithAddress, critter: Critter, squeakable: Squeakable;

  // test variables
  const squeaks = [
    'Now THIS is podracing!',
    'I hate sand 😤',
    'Hello there!',
    'A surpise to be sure, but a welcome one.',
  ];

  const totalSupplyFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed creates an account
    await critter.connect(ahmed).createAccount('ahmed');

    // ahmed creates a few squeaks
    squeaks.forEach(
      async (content) => await critter.connect(ahmed).createSqueak(content)
    );

    // ahmed burns the first created squeak at tokenId 0
    await run('delete-squeak', {
      contracts: { critter, squeakable },
      signer: ahmed,
      squeakId: 0,
    });

    return squeakable;
  };

  it('returns the number of unburned squeaks in circulation', async () => {
    squeakable = await loadFixture(totalSupplyFixture);

    expect(await squeakable.totalSupply()).to.eq(squeaks.length - 1);
  });
});

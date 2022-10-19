import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

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
    [, ahmed] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a few squeaks
    squeaks.forEach(async (content) => await critter.createSqueak(content));

    // ahmed burns the first created squeak at tokenId 0
    await hardhat.run('delete-squeak', {
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

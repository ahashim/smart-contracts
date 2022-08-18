import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('balanceOf', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const balanceOfFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    squeakId = await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    });

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(balanceOfFixture));
  });

  it('lets a user get a balance of their squeaks', async () => {
    expect(await critter.balanceOf(ahmed.address)).to.eq(1);
  });

  it('returns zero when looking up the balance of a non-existent account', async () => {
    expect(await critter.balanceOf(owner.address)).to.eq(0);
  });

  it('reverts when getting the balance of the zero address', async () => {
    await expect(critter.balanceOf(ethers.constants.AddressZero)).to.be
      .reverted;
  });
});

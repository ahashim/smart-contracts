import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('setApprovalForAll', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const setApprovalForAllFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // barbie creates an account
    await critter.connect(barbie).createAccount('barbie');

    // ahmed creates an account & posts a few squeaks
    await critter.createAccount('ahmed');
    [
      'Now THIS is podracing!',
      'I hate sand 😤',
      'Hello there!',
      'A surpise to be sure, but a welcome one.',
    ].forEach(async (content) => await critter.createSqueak(content));

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, barbie & ahmed create an accounts, and ahmed posts a few squeaks',
    async () => {
      critter = await loadFixture(setApprovalForAllFixture);
    }
  );

  it('returns true if an operator is approved to manage all of the owners squeaks', async () => {
    await critter.setApprovalForAll(barbie.address, true);
    expect(await critter.isApprovedForAll(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('emits an ApprovalForAll event', async () => {
    await expect(critter.setApprovalForAll(barbie.address, true))
      .to.emit(critter, 'ApprovalForAll')
      .withArgs(ahmed.address, barbie.address, true);
  });

  it('reverts if the owner and operator are the same address', async () => {
    await expect(critter.setApprovalForAll(ahmed.address, true)).to.be
      .reverted;
  });
});

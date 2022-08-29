import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('setApprovalForAll', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const setApprovalForAllFixture = async () => {
    // deploy contracts
    critter = (await run('deploy-contract')).connect(ahmed);

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a few squeaks
    [
      'Now THIS is podracing!',
      'I hate sand 😤',
      'Hello there!',
      'A surpise to be sure, but a welcome one.',
    ].forEach(async (content) => await critter.createSqueak(content));

    // ahmed approves barbie as an operator on his behalf
    tx = await critter.setApprovalForAll(barbie.address, true);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(setApprovalForAllFixture));
  });

  it('returns true if an operator is approved to manage all of the owners squeaks', async () => {
    expect(await critter.isApprovedForAll(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('emits an ApprovalForAll event', async () => {
    await expect(tx)
      .to.emit(critter, 'ApprovalForAll')
      .withArgs(ahmed.address, barbie.address, true);
  });

  it('reverts if the owner and operator are the same address', async () => {
    await expect(critter.setApprovalForAll(ahmed.address, true)).to.be
      .reverted;
  });
});

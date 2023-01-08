import type {
  ContractTransaction,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('setApprovalForAll', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable,
    tx: ContractTransaction;

  const setApprovalForAllFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

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
    ].forEach(
      async (content) => await critter.connect(ahmed).createSqueak(content)
    );

    // ahmed approves barbie as an operator on his behalf
    tx = await squeakable
      .connect(ahmed)
      .setApprovalForAll(barbie.address, true);

    return { squeakable, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ squeakable, tx } = await loadFixture(setApprovalForAllFixture));
  });

  it('returns true if an operator is approved to manage all of the owners squeaks', async () => {
    expect(await squeakable.isApprovedForAll(ahmed.address, barbie.address)).to
      .be.true;
  });

  it('emits an ApprovalForAll event', async () => {
    await expect(tx)
      .to.emit(squeakable, 'ApprovalForAll')
      .withArgs(ahmed.address, barbie.address, true);
  });
});

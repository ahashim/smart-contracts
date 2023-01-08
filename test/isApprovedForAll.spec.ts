import type { Critter, SignerWithAddress, Squeakable } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('isApprovedForAll', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable;

  const isApprovedForAllFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    await critter.connect(ahmed).createSqueak('hello blockchain!');

    // ahmed approves barbie to manage all his squeaks
    await squeakable.connect(ahmed).setApprovalForAll(barbie.address, true);

    return squeakable;
  };

  beforeEach(
    'load deployed contract fixture, barbie & ahmed create an accounts, and ahmed posts a squeak',
    async () => {
      squeakable = await loadFixture(isApprovedForAllFixture);
    }
  );

  it('returns true if a user is approved to manage all assets of an owner', async () => {
    expect(await squeakable.isApprovedForAll(ahmed.address, barbie.address)).to
      .be.true;
  });

  it('returns false if a user is not approved to manage all assets of an owner', async () => {
    expect(await squeakable.isApprovedForAll(barbie.address, ahmed.address)).to
      .be.false;
  });
});

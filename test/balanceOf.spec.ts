import type {
  BigNumberObject,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('balanceOf', () => {
  let ahmed: SignerWithAddress,
    balances: BigNumberObject,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable;

  const balanceOfFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed creates an account
    await critter.connect(ahmed).createAccount('ahmed');

    // ahmed creates a squeak
    await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    });

    return {
      balances: {
        ahmed: await squeakable.balanceOf(ahmed.address),
        barbie: await squeakable.balanceOf(barbie.address),
      },
      squeakable,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ balances, squeakable } = await loadFixture(balanceOfFixture));
  });

  it('lets a user get a balance of their squeaks', () => {
    expect(balances.ahmed).to.eq(1);
  });

  it('returns zero when looking up the balance of an unknown account', () => {
    expect(balances.barbie).to.eq(0);
  });

  it('reverts when getting the balance of the zero address', async () => {
    await expect(
      squeakable.balanceOf(ethers.constants.AddressZero)
    ).to.be.revertedWithCustomError(squeakable, 'BalanceQueryForZeroAddress');
  });
});

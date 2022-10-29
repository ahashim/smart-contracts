import type { BigNumberObject, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('balanceOf', () => {
  let ahmed: SignerWithAddress,
    balances: BigNumberObject,
    barbie: SignerWithAddress,
    critter: Critter;

  const balanceOfFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    });

    return {
      balances: {
        ahmed: await critter.balanceOf(ahmed.address),
        barbie: await critter.balanceOf(barbie.address),
      },
      critter,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ balances, critter } = await loadFixture(balanceOfFixture));
  });

  it('lets a user get a balance of their squeaks', () => {
    expect(balances.ahmed).to.eq(1);
  });

  it('returns zero when looking up the balance of an unknown account', () => {
    expect(balances.barbie).to.eq(0);
  });

  it('reverts when getting the balance of the zero address', async () => {
    await expect(
      critter.balanceOf(ethers.constants.AddressZero)
    ).to.be.revertedWithCustomError(critter, 'BalanceQueryForZeroAddress');
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumberObject } from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('balanceOf', () => {
  let ahmed: SignerWithAddress,
    balances: BigNumberObject,
    barbie: SignerWithAddress,
    critter: Critter;

  const balanceOfFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    await hardhat.run('create-squeak', {
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

  it('lets a user get a balance of their squeaks', async () => {
    expect(balances.ahmed).to.eq(1);
  });

  it('returns zero when looking up the balance of an unknown account', async () => {
    expect(balances.barbie).to.eq(0);
  });

  it('reverts when getting the balance of the zero address', async () => {
    await expect(
      critter.balanceOf(hardhat.ethers.constants.AddressZero)
    ).to.be.revertedWithCustomError(critter, 'BalanceQueryForZeroAddress');
  });
});

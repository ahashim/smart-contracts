import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, run } from 'hardhat';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { User } from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('createAccount', () => {
  const username = 'ahmed';
  let address: string,
    ahmed: Wallet,
    barbie: Wallet,
    critter: Critter,
    tx: ContractTransaction,
    user: User;

  const createAccountFixture = async () => {
    [, ahmed, barbie] = await (ethers as any).getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    tx = await critter.createAccount(username);

    return {
      address: await critter.addresses(username),
      critter,
      tx,
      user: await critter.users(ahmed.address),
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ address, critter, tx, user } = await loadFixture(createAccountFixture));
  });

  it('lets a user create an account with a valid username', async () => {
    expect(user.username).to.eq(username);
    expect(address).to.eq(ahmed.address);
  });

  it('emits an AccountCreated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountCreated')
      .withArgs(ahmed.address, user.username);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.createAccount('')).to.be.revertedWithCustomError(
      critter,
      'UsernameEmpty'
    );
  });

  it('reverts when the username is too long', async () => {
    await expect(
      critter.createAccount(
        'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?'
      )
    ).to.be.revertedWithCustomError(critter, 'UsernameTooLong');
  });

  it('reverts when the username has been taken', async () => {
    await expect(
      critter.connect(barbie).createAccount(username)
    ).to.be.revertedWithCustomError(critter, 'UsernameUnavailable');
  });

  it('reverts when the address already has an account', async () => {
    await expect(
      critter.createAccount('a-rock')
    ).to.be.revertedWithCustomError(critter, 'AlreadyRegistered');
  });
});

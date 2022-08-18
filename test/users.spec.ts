import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';
import { AccountStatus } from '../enums';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import { User } from '../types';

describe('users', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let validUser: User, nullUser: User;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const usersFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // create account
    await critter.createAccount(username);

    return {
      critter,
      nullUser: await critter.users(
        '0x000000000000000000000000000000000000A455'
      ),
      validUser: await critter.users(ahmed.address),
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account',
    async () => {
      ({ critter, nullUser, validUser } = await loadFixture(usersFixture));
    }
  );

  // test variables
  const username = 'ahmed';

  it('returns a username of an account', async () => {
    expect(validUser.username).to.eq(username);
  });

  it('returns a default active status for an account', async () => {
    expect(validUser.status).to.eq(AccountStatus.Active);
  });

  it('returns a default scout level of 0 for an account', async () => {
    expect(validUser.scoutLevel).to.eq(1);
  });

  it('returns the address for an account', async () => {
    expect(validUser.account).to.eq(ahmed.address);
  });

  it('returns zero values for a non-existent account', async () => {
    expect(nullUser.account).to.eq(ethers.constants.AddressZero);
    expect(nullUser.status).to.eq(AccountStatus.NonExistent);
    expect(nullUser.scoutLevel).to.eq(0);
    expect(nullUser.username).to.be.empty;
  });

  it('reverts when a proper address is not provided', async () => {
    await expect(critter.users("the droids you're looking for")).to.be
      .reverted;
  });
});

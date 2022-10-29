import { Status } from '../enums';
import type { Critter, SignerWithAddress, User } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('users', () => {
  const username = 'ahmed';

  let ahmed: SignerWithAddress,
    critter: Critter,
    validUser: User,
    nullUser: User;

  const usersFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
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

  it('returns a username of an account', () => {
    expect(validUser.username).to.eq(username);
  });

  it('returns a default active status for an account', () => {
    expect(validUser.status).to.eq(Status.Active);
  });

  it('returns a default scout level of 0 for an account', () => {
    expect(validUser.scoutLevel).to.eq(1);
  });

  it('returns the address for an account', () => {
    expect(validUser.account).to.eq(ahmed.address);
  });

  it('returns zero values for an unknown account', () => {
    expect(nullUser.account).to.eq(ethers.constants.AddressZero);
    expect(nullUser.status).to.eq(Status.Unknown);
    expect(nullUser.scoutLevel).to.eq(0);
    expect(nullUser.username).to.be.empty;
  });
});

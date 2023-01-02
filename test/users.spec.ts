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
    critter = (await run('deploy-critter-contract')).critter.connect(ahmed);

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

  it('returns a username of a user', () => {
    expect(validUser.username).to.eq(username);
  });

  it('returns a default active status for a user', () => {
    expect(validUser.status).to.eq(Status.Active);
  });

  it('returns a default level of 1 for a user', () => {
    expect(validUser.level).to.eq(1);
  });

  it('returns the address for a user', () => {
    expect(validUser.account).to.eq(ahmed.address);
  });

  it('returns zero values for an unknown user', () => {
    expect(nullUser.account).to.eq(ethers.constants.AddressZero);
    expect(nullUser.status).to.eq(Status.Unknown);
    expect(nullUser.level).to.eq(0);
    expect(nullUser.username).to.be.empty;
  });
});

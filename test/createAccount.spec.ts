import type {
  ContractTransaction,
  Critter,
  LibraryContracts,
  SignerWithAddress,
  User,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('createAccount', () => {
  const username = 'ahmed';
  let address: string,
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    libraries: LibraryContracts,
    tx: ContractTransaction,
    user: User;

  const createAccountFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    ({ critter, libraries } = await run('deploy-contracts'));
    critter = critter.connect(ahmed);

    // ahmed creates an account
    tx = await critter.createAccount(username);

    return {
      address: await critter.addresses(username),
      critter,
      libraries,
      tx,
      user: await critter.users(ahmed.address),
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ address, critter, libraries, tx, user } = await loadFixture(
      createAccountFixture
    ));
  });

  it('lets a user create an account with a valid username', () => {
    expect(user.username).to.eq(username);
    expect(address).to.eq(ahmed.address);
  });

  it('emits an AccountCreated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountCreated')
      .withArgs(
        ahmed.address,
        ethers.utils.formatBytes32String(user.username)
      );
  });

  it('reverts when the username is empty', async () => {
    await expect(
      critter.connect(barbie).createAccount('')
    ).to.be.revertedWithCustomError(libraries.libValidation, 'UsernameEmpty');
  });

  it('reverts when the username is too short', async () => {
    await expect(
      critter.connect(barbie).createAccount('0x')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameTooShort'
    );
  });

  it('reverts when the username is too long', async () => {
    await expect(
      critter
        .connect(barbie)
        .createAccount(
          'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?'
        )
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameTooLong'
    );
  });

  it('reverts when the username has uppercase characters', async () => {
    await expect(
      critter.connect(barbie).createAccount('Babs')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the username has symbols', async () => {
    await expect(
      critter.connect(barbie).createAccount('b@rbi3')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the username has spaces', async () => {
    await expect(
      critter.connect(barbie).createAccount(' b a r b i e ')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the username has been taken', async () => {
    await expect(
      critter.connect(barbie).createAccount(username)
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameUnavailable'
    );
  });

  it('reverts when the address already has an account', async () => {
    await expect(critter.createAccount('yoda')).to.be.revertedWithCustomError(
      critter,
      'AlreadyRegistered'
    );
  });
});

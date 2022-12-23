import { Status } from '../enums';
import type {
  ContractTransaction,
  Critter,
  LibraryContracts,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('updateUsername', () => {
  const oldUsername = 'ahmed';
  const newUsername = 'anakin';

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    libraries: LibraryContracts,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const updateUsernameFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
    ({ critter, libraries } = await run('deploy-contracts'));
    critter = critter.connect(ahmed);

    // ahmed creates an account
    await critter.createAccount(oldUsername);

    // ahmed updates their username
    tx = await critter.updateUsername(newUsername);

    // barbie creates an account with ahmeds old username
    await critter.connect(barbie).createAccount(oldUsername);

    return {
      critter,
      libraries,
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(updateUsernameFixture));
  });

  it('lets a user create an account with a valid username', async () => {
    expect((await critter.users(ahmed.address)).username).to.eq(newUsername);
    expect(await critter.addresses(newUsername)).to.eq(ahmed.address);
  });

  it('makes the old username available when updating to a new one', async () => {
    expect((await critter.users(barbie.address)).username).to.eq(oldUsername);
    expect(await critter.addresses(oldUsername)).to.eq(barbie.address);
  });

  it('emits an AccountUsernameUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountUsernameUpdated')
      .withArgs(ahmed.address, newUsername);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.updateUsername('')).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameEmpty'
    );
  });

  it('reverts when the username is too short', async () => {
    await expect(critter.updateUsername('0x')).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameTooShort'
    );
  });

  it('reverts when the username is too long', async () => {
    await expect(
      critter.updateUsername(
        'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?'
      )
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameTooLong'
    );
  });

  it('reverts when the username has uppercase characters', async () => {
    await expect(
      critter.updateUsername('Ahmed')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the username has symbols', async () => {
    await expect(
      critter.updateUsername('@hmed')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the username has spaces', async () => {
    await expect(
      critter.updateUsername(' a h m e d ')
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameInvalid'
    );
  });

  it('reverts when the address already has an account', async () => {
    await expect(
      critter.updateUsername(newUsername)
    ).to.be.revertedWithCustomError(
      libraries.libValidation,
      'UsernameUnavailable'
    );
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(carlos).updateUsername('ahmed')
    ).to.be.revertedWithCustomError(critter, 'InvalidAccount');
  });

  it('reverts when the account status is not active', async () => {
    // ban ahmed
    await critter.connect(owner).updateStatus(ahmed.address, Status.Banned);

    await expect(
      critter.updateUsername('ahmed')
    ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });
});

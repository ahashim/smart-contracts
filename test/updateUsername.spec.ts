import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import { ContractTransaction, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';
import { AccountStatus } from '../enums';

describe('updateUsername', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let oldUsername: string, newUsername: string, longUsername: string;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const updateUsernameFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    oldUsername = 'ahmed';
    newUsername = 'a-rock';

    // ahmed creates an account & updates their username
    await critter.createAccount(oldUsername);
    tx = await critter.updateUsername(newUsername);

    return {
      critter,
      oldUsername,
      newUsername,
      longUsername:
        'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?',
      tx,
    };
  };

  beforeEach('deploy test contract', async () => {
    ({ critter, oldUsername, newUsername, longUsername, tx } =
      await loadFixture(updateUsernameFixture));
  });

  it('lets a user create an account with a valid username', async () => {
    expect((await critter.users(ahmed.address)).username).to.eq(newUsername);
    expect(await critter.getAddress(newUsername)).to.eq(ahmed.address);
  });

  it('makes the old username available when updating to a new one', async () => {
    await critter.connect(owner).createAccount(oldUsername);

    expect((await critter.users(owner.address)).username).to.eq(oldUsername);
    expect(await critter.getAddress(oldUsername)).to.eq(owner.address);
  });

  it('emits an AccountUsernameUpdated event', async () => {
    await expect(tx)
      .to.emit(critter, 'AccountUsernameUpdated')
      .withArgs(ahmed.address, newUsername);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.updateUsername('')).to.be.reverted;
  });

  it('reverts when the username is too long', async () => {
    await expect(critter.updateUsername(longUsername)).to.be.reverted;
  });

  it('reverts when the address already has an account', async () => {
    await expect(critter.updateUsername('a-rock')).to.be.reverted;
  });

  it('reverts when the account is not active', async () => {
    // ban ahmed
    await critter
      .connect(owner)
      .updateAccountStatus(ahmed.address, AccountStatus.Banned);

    await expect(critter.updateUsername('ahmed')).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    // pause the contract
    await critter.connect(owner).pause();
    await expect(critter.updateUsername(newUsername)).to.be.reverted;
  });
});

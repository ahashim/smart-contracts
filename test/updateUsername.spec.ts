import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('updateUsername', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const updateUsernameFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    await critter.createAccount(oldUsername);

    return critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(updateUsernameFixture);
  });

  // test variables
  const oldUsername = 'ahmed';
  const newUsername = 'a-rock';
  const longUsername =
    'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?';

  it('lets a user create an account with a valid username', async () => {
    await critter.updateUsername(newUsername);
    expect((await critter.users(ahmed.address)).username).to.eq(newUsername);
    expect(await critter.addresses(newUsername)).to.eq(ahmed.address);
  });

  it('makes the old username available when updating to a new one', async () => {
    await critter.updateUsername(newUsername);
    await critter.connect(owner).createAccount(oldUsername);
    expect((await critter.users(owner.address)).username).to.eq(oldUsername);
    expect(await critter.addresses(oldUsername)).to.eq(owner.address);
  });

  it('emits an UsernameUpdated event', async () => {
    await expect(critter.updateUsername(newUsername))
      .to.emit(critter, 'UsernameUpdated')
      .withArgs(ahmed.address, newUsername);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.updateUsername('')).to.be.reverted;
  });

  it('reverts when the username is too long', async () => {
    await expect(critter.updateUsername(longUsername)).to.be.reverted;
  });

  it('reverts when the address already has an account', async () => {
    await critter.updateUsername(newUsername);
    await expect(critter.updateUsername('a-rock')).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(critter.updateUsername(newUsername)).to.be.reverted;
  });
});

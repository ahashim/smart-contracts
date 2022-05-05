import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('createAccount', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const createAccountFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;

    return critter.connect(ahmed);
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(createAccountFixture);
  });

  // test variables
  const username = 'ahmed';
  const longUsername =
    'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?';

  it('lets a user create an account with a valid username', async () => {
    await critter.createAccount(username);
    expect(await critter.usernames(ahmed.address)).to.eq(username);
    expect(await critter.addresses(username)).to.eq(ahmed.address);
  });

  it('emits an AccountCreated event', async () => {
    await expect(critter.createAccount(username))
      .to.emit(critter, 'AccountCreated')
      .withArgs(ahmed.address, username);
  });

  it('reverts when the username is empty', async () => {
    await expect(critter.createAccount('')).to.be.reverted;
  });

  it('reverts when the username is too long', async () => {
    await expect(critter.createAccount(longUsername)).to.be.reverted;
  });

  it('reverts when the address already has an account', async () => {
    await critter.createAccount(username);
    await expect(critter.createAccount('a-rock')).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(critter.createAccount(username)).to.be.reverted;
  });
});

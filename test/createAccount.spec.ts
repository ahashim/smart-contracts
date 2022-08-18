import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { ContractTransaction, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('createAccount', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let longUsername =
    'hasAnyoneReallyBeenFarEvenAsDecidedToUseEvenGoWantToDoLookMoreLike?';
  let owner: Wallet, ahmed: Wallet;
  let tx: ContractTransaction;
  let username = 'ahmed';

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const createAccountFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    tx = await critter.createAccount(username);

    return { critter, longUsername, tx, username };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, longUsername, tx, username } = await loadFixture(
      createAccountFixture
    ));
  });

  it('lets a user create an account with a valid username', async () => {
    expect((await critter.users(ahmed.address)).username).to.eq(username);
    expect(await critter.addresses(username)).to.eq(ahmed.address);
  });

  it('emits an AccountCreated event', async () => {
    await expect(tx)
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
    await expect(critter.createAccount('a-rock')).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(critter.createAccount(username)).to.be.reverted;
  });
});

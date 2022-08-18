import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('addresses', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let username = 'ahmed';

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const addressesFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount(username);

    return { critter, username };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, username } = await loadFixture(addressesFixture));
  });

  it('returns the address of an account', async () => {
    expect(await critter.addresses(username)).to.eq(ahmed.address);
  });

  it('returns the zero address for a non-existent account', async () => {
    expect(await critter.addresses('obi-wan')).to.eq(
      ethers.constants.AddressZero
    );
  });
});

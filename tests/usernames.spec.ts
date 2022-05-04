import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('usernames', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const usernamesFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // create account
    await critter.createAccount(username);

    return critter;
  };

  beforeEach(
    'deploy test contract, and ahmed creates an account',
    async () => {
      critter = await loadFixture(usernamesFixture);
    }
  );

  // test variables
  const username = 'ahmed';

  it('returns a username of an account using their address', async () => {
    expect(await critter.usernames(ahmed.address)).to.eq(username);
  });

  it('reverts when looking up non-existent a username', async () => {
    await expect(critter.usernames('nonexistent-user')).to.be.reverted;
  });
});

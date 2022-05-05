import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('addresses', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const addressesFixture = async () => {
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
      critter = await loadFixture(addressesFixture);
    }
  );

  // test variables
  const username = 'ahmed';

  it('returns a username of an account using their address', async () => {
    expect(await critter.addresses(username)).to.eq(ahmed.address);
  });

  it('returns address zero for a non-existent username', async () => {
    expect(await critter.addresses('nonexistent-user')).to.eq(
      ethers.constants.AddressZero
    );
  });
});

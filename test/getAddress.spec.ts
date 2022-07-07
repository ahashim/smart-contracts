import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('getAddress', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let username: string;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const getAddressFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;
    username = 'ahmed';

    // ahmed creates an account
    await critter.createAccount(username);

    return { critter, username };
  };

  beforeEach('deploy test contract', async () => {
    ({ critter, username } = await loadFixture(getAddressFixture));
  });

  it('returns the address of an account', async () => {
    expect(await critter.getAddress(username)).to.eq(ahmed.address);
  });

  it('returns the zero address for a non-existent account', async () => {
    expect(await critter.getAddress('obi-wan')).to.eq(
      ethers.constants.AddressZero
    );
  });
});

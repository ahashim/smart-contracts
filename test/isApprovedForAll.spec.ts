import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('isApprovedForAll', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const isApprovedForAllFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // barbie creates an account
    await critter.connect(barbie).createAccount('barbie');

    // ahmed creates an account, posts a squeak, and approves barbie
    await critter.createAccount('ahmed');
    await critter.createSqueak('hello blockchain!');
    await critter.setApprovalForAll(barbie.address, true);

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, barbie & ahmed create an accounts, and ahmed posts a squeak',
    async () => {
      critter = await loadFixture(isApprovedForAllFixture);
    }
  );

  it('returns true if an operator is approved to manage all assets of an owner', async () => {
    expect(await critter.isApprovedForAll(barbie.address, ahmed.address)).to.be
      .false;
  });

  it('returns false if an operator is not approved to manage all assets of an owner', async () => {
    expect(await critter.isApprovedForAll(barbie.address, ahmed.address)).to.be
      .false;
  });
});

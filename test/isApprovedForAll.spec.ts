import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

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
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    await critter.createSqueak('hello blockchain!');

    // ahmed approves barbie as an operator on his behalf
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
    expect(await critter.isApprovedForAll(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('returns false if an operator is not approved to manage all assets of an owner', async () => {
    expect(await critter.isApprovedForAll(barbie.address, ahmed.address)).to.be
      .false;
  });
});

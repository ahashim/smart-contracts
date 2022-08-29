import { ethers, run, waffle } from 'hardhat';
import { expect } from 'chai';

// types
import type { Critter } from '../typechain-types/contracts';
import type { BigNumber, Wallet } from 'ethers';

describe('getApproved', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const approveFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // barbie creates an account
    critter.connect(barbie).createAccount('barbie');

    // ahmed approves barbie for it
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(approveFixture));
  });

  it('returns the account approved to manage a squeak', async () => {
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getApproved(420)).to.be.reverted;
  });
});

import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('approve', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const approveFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed & barbie create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    squeakId = await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    });

    // ahmed approves barbie to transfer the squeak
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(approveFixture));
  });

  it('lets a user approve another account to manage a squeak', async () => {
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('sets the approver back to the zero address after transferring a squeak', async () => {
    await critter
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);

    expect(await critter.getApproved(squeakId)).to.eq(
      ethers.constants.AddressZero
    );
  });

  it('reverts if someone other than the owner tries to approve the squeak', async () => {
    await expect(critter.connect(carlos).approve(ahmed.address, squeakId)).to
      .be.reverted;
  });
});

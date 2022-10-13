import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { EMPTY_BYTE_STRING } from '../constants';
import { Status, Interaction } from '../enums';

// types
import type { BigNumber, ContractTransaction, Wallet } from 'ethers';
import type { SentimentCounts, Squeak } from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('deleteSqueak', () => {
  let critter: Critter;
  let barbieSqueak: BigNumber,
    deleteFee: BigNumber,
    squeakId: BigNumber,
    treasuryBalance: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let sentiment: SentimentCounts;
  let squeak: Squeak;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const deleteSqueakFixture = async () => {
    // deploy contract
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed, barbie, and carlos all create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed creates a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    }));

    // barbie likes the squeak
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: barbie,
      squeakId,
    });

    // carlos dislikes the squeak
    await run('interact', {
      contract: critter,
      interaction: Interaction.Dislike,
      signer: barbie,
      squeakId,
    });

    // snapshot treasury balance before deleting the squeak
    treasuryBalance = await critter.treasury();

    // ahmed deletes the squeak
    ({ deleteFee, tx } = await run('delete-squeak', {
      contract: critter,
      signer: ahmed,
      squeakId,
    }));

    // barbie creates a squeak
    ({ squeakId: barbieSqueak } = await run('create-squeak', {
      content: 'come on barbie, lets go party',
      contract: critter,
      signer: barbie,
    }));

    return {
      barbieSqueak,
      critter,
      deleteFee,
      sentiment: await critter.getSentimentCounts(squeakId),
      squeak: await critter.squeaks(squeakId),
      squeakId,
      treasuryBalance,
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({
      barbieSqueak,
      critter,
      deleteFee,
      sentiment,
      squeak,
      squeakId,
      treasuryBalance,
      tx,
    } = await loadFixture(deleteSqueakFixture));
  });

  it('lets an owner delete their squeak for a fee', async () => {
    expect(await critter.balanceOf(ahmed.address)).to.equal(0);
  });

  it('removes all squeak information upon deletion', async () => {
    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it('removes all associated sentiment for the squeak', async () => {
    expect(sentiment.dislikes).to.eq(0);
    expect(sentiment.likes).to.eq(0);
    expect(sentiment.resqueaks).to.eq(0);
  });

  it('deposits the delete fee into the treasury', async () => {
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(deleteFee);
  });

  it('emits a SqueakDeleted event', async () => {
    expect(tx)
      .to.emit(critter, 'SqueakDeleted')
      .withArgs(ahmed.address, squeakId);
  });

  it('reverts when the delete fee is not sufficient', async () => {
    await expect(critter.deleteSqueak(squeakId, { value: 1 })).to.be.reverted;
  });

  it('reverts when a user who is not an owner or approver tries to delete the squeak', async () => {
    await expect(critter.deleteSqueak(barbieSqueak)).to.be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(critter.deleteSqueak(squeakId, { value: deleteFee })).to.be
      .reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).deleteSqueak(squeakId, { value: deleteFee })
    ).to.be.reverted;
  });

  it('reverts when the user account is not active', async () => {
    // moderator suspends squeak owners account
    await critter.connect(owner).updateStatus(ahmed.address, Status.Suspended);

    await expect(critter.deleteSqueak(squeakId, { value: deleteFee })).to.be
      .reverted;
  });
});

import { EMPTY_BYTE_STRING } from '../constants';
import { Interaction, Status } from '../enums';
import type {
  BigNumber,
  ContractTransaction,
  Critter,
  LibraryContracts,
  SentimentCounts,
  SignerWithAddress,
  Squeak,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('deleteSqueak', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    barbieSqueak: BigNumber,
    carlos: SignerWithAddress,
    critter: Critter,
    deleteFee: BigNumber,
    libraries: LibraryContracts,
    owner: SignerWithAddress,
    sentiment: SentimentCounts,
    squeak: Squeak,
    squeakable: Squeakable,
    squeakId: BigNumber,
    treasuryBalance: BigNumber,
    tx: ContractTransaction;

  const deleteSqueakFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
    ({ critter, libraries, squeakable } = await run('initialize-contracts'));

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
      contracts: { critter, squeakable },
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
      libraries,
      sentiment: await critter.getSentimentCounts(squeakId),
      squeak: await squeakable.squeaks(squeakId),
      squeakable,
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
      libraries,
      sentiment,
      squeak,
      squeakable,
      squeakId,
      treasuryBalance,
      tx,
    } = await loadFixture(deleteSqueakFixture));
  });

  it('lets an owner delete their squeak for a fee', async () => {
    expect(await squeakable.balanceOf(ahmed.address)).to.equal(0);
  });

  it('removes all squeak information upon deletion', () => {
    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it('removes all associated sentiment for the squeak', () => {
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
    await expect(
      critter.connect(barbie).deleteSqueak(barbieSqueak, { value: 1 })
    ).to.be.revertedWithCustomError(
      libraries.libBankable,
      'InsufficientFunds'
    );
  });

  it('reverts when a user who is not an owner or approver tries to delete the squeak', async () => {
    await expect(
      critter.connect(ahmed).deleteSqueak(barbieSqueak, { value: deleteFee })
    ).to.be.revertedWithCustomError(squeakable, 'NotApprovedOrOwner');
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.connect(ahmed).deleteSqueak(squeakId, { value: deleteFee })
    ).to.be.revertedWithCustomError(critter, 'SqueakDoesNotExist');
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).deleteSqueak(barbieSqueak, { value: deleteFee })
    ).to.be.revertedWithCustomError(critter, 'InvalidAccount');
  });

  it('reverts when the users account status is not active', async () => {
    // moderator suspends squeak owners account
    await critter
      .connect(owner)
      .updateStatus(barbie.address, Status.Suspended);

    await expect(
      critter.connect(barbie).deleteSqueak(barbieSqueak, { value: deleteFee })
    ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });
});

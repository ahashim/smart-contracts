import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  EMPTY_BYTE_STRING,
} from '../constants';
import { AccountStatus, Interaction } from '../enums';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import type { Squeak } from '../types';
import type { Critter } from '../typechain-types/contracts';

describe('deleteSqueak', () => {
  let critter: Critter;
  let deleteFee: BigNumber,
    squeakId: BigNumber,
    treasuryStartingBalance: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeak: Squeak;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const deleteSqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // ahmed creates an account & posts a squeak
    await critter.createAccount('ahmed');
    tx = await critter.createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // barbie creates an account & likes the squeak
    await critter.connect(barbie).createAccount('barbie');
    await critter.connect(barbie).interact(squeakId, Interaction.Like, {
      value: await critter.fees(Interaction.Like),
    });

    // carlos creates an account & dislikes the squeak
    await critter.connect(carlos).createAccount('carlos');
    await critter.connect(carlos).interact(squeakId, Interaction.Dislike, {
      value: await critter.fees(Interaction.Like),
    });

    return {
      critter,
      deleteFee: await critter.getDeleteFee(squeakId),
      squeakId,
      treasuryStartingBalance: await critter.treasury(),
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak which barbie likes, and carlos dislikes',
    async () => {
      ({ critter, deleteFee, squeakId, treasuryStartingBalance } =
        await loadFixture(deleteSqueakFixture));
    }
  );

  it('lets an owner delete their squeak for a fee', async () => {
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    expect(await critter.balanceOf(ahmed.address)).to.equal(0);
  });

  it('removes all squeak information upon deletion', async () => {
    // delete squeak & retrieve it
    await critter.deleteSqueak(squeakId, { value: deleteFee });
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it('removes all associated sentiment for the squeak', async () => {
    // delete the squeak
    await critter.deleteSqueak(squeakId, { value: deleteFee });
    const { dislikes, likes, resqueaks } = await critter.getSentimentCounts(
      squeakId
    );

    expect(dislikes).to.eq(0);
    expect(likes).to.eq(0);
    expect(resqueaks).to.eq(0);
  });

  it('deposits the delete fee into the treasury', async () => {
    const expectedDifference = ethers.utils.parseEther('0.00025');

    // delete squeak
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
      expectedDifference
    );
  });

  it('refunds any excess funds back to the sender', async () => {
    // delete squeak
    const tx = await critter.deleteSqueak(squeakId, { value: deleteFee });

    // NOTE: Part of the fee refund is lost to slippage due the chain continuing
    // to mine blocks while getting the original delete fee, so by the time the
    // actual get delete fee request is sent, the fee expected is slightly
    // higher than what was reported, therefore the refund is slightly less.
    // This is why we cannot calculate the fee refunded beforehand. Consider
    // this is a UX tax to keep the 'getDeleteFee(id)' method simple.
    const expectedRefund = ethers.utils.parseEther('0.00025');

    await expect(tx)
      .to.emit(critter, 'FundsTransferred')
      .withArgs(ahmed.address, expectedRefund);
  });

  it('emits a SqueakDeleted event', async () => {
    expect(await critter.deleteSqueak(squeakId, { value: deleteFee }))
      .to.emit(critter, 'SqueakDeleted')
      .withArgs(ahmed.address, squeakId);
  });

  it('reverts when the delete fee is not sufficient', async () => {
    await expect(critter.deleteSqueak(squeakId, { value: 1 })).to.be.reverted;
  });

  it('reverts when a user who is not an owner or approver tries to delete the squeak', async () => {
    await expect(
      critter.connect(barbie).deleteSqueak(squeakId, { value: deleteFee })
    ).to.be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await critter.deleteSqueak(squeakId, { value: deleteFee });
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
    await critter
      .connect(owner)
      .updateAccountStatus(ahmed.address, AccountStatus.Suspended);

    await expect(critter.deleteSqueak(squeakId, { value: deleteFee })).to.be
      .reverted;
  });

  it('reverts when the contract is paused', async () => {
    // owner pauses the contract
    await critter.connect(owner).pause();

    await expect(critter.deleteSqueak(squeakId, { value: deleteFee })).to.be
      .reverted;
  });
});

import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONFIRMATION_THRESHOLD,
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  INTERACTION,
  PLATFORM_FEE,
} from '../constants';

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
  let deleteFee: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeak: Squeak;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber, treasuryEndingBalance: BigNumber;
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
    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    // carlos creates an account & dislikes the squeak
    await critter.connect(carlos).createAccount('carlos');
    await critter
      .connect(carlos)
      .interact(squeakId, INTERACTION.Dislike, { value: PLATFORM_FEE });

    // get the delete fee
    deleteFee = await critter.getDeleteFee(squeakId, CONFIRMATION_THRESHOLD);

    return { critter, deleteFee, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak which barbie likes, and carlos dislikes',
    async () => {
      ({ critter, deleteFee, squeakId } = await loadFixture(
        deleteSqueakFixture
      ));
    }
  );

  it('lets an owner delete their squeak for a fee', async () => {
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    expect(await critter.balanceOf(ahmed.address)).to.equal(0);
  });

  it('removes all squeak information upon deletion', async () => {
    await critter.deleteSqueak(squeakId, { value: deleteFee });
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq('');
  });

  it('removes all associated likes & dislikes for the squeak', async () => {
    await critter.deleteSqueak(squeakId, { value: deleteFee });

    expect(await critter.getLikeCount(squeakId)).to.eq(0);
    expect(await critter.getDislikeCount(squeakId)).to.eq(0);
  });

  it('deposits the delete fee into the treasury', async () => {
    treasuryStartingBalance = await critter.treasury();
    await critter.deleteSqueak(squeakId, { value: deleteFee });
    treasuryEndingBalance = await critter.treasury();

    expect(treasuryEndingBalance.sub(treasuryStartingBalance)).to.eq(
      deleteFee
    );
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

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(critter.deleteSqueak(squeakId, { value: deleteFee })).to.be
      .reverted;
  });
});

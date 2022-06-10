import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  INTERACTION,
  PLATFORM_FEE,
} from '../constants';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('undoResqueak', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber;
  let undoResqueakTx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const undoResqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // barbie creates an account & posts a squeak
    await critter.connect(barbie).createAccount('barbie');
    const tx = (await critter
      .connect(barbie)
      .createSqueak('hello blockchain!')) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed creates an account & resqueaks barbie
    await critter.createAccount('ahmed');
    await critter.interact(squeakId, INTERACTION.Resqueak, {
      value: PLATFORM_FEE,
    });

    // get current treasury balance
    const treasuryStartingBalance = await critter.treasury();

    // ahmed undoes the resqueak
    const undoResqueakTx = (await critter.interact(
      squeakId,
      INTERACTION.UndoResqueak,
      { value: PLATFORM_FEE }
    )) as ContractTransaction;

    return { critter, squeakId, treasuryStartingBalance, undoResqueakTx };
  };

  beforeEach(
    'deploy test contract, barbie creates an account and posts a squeak that ahmed resqueaks, then undoes the resqueak',
    async () => {
      ({ critter, squeakId, treasuryStartingBalance, undoResqueakTx } =
        await loadFixture(undoResqueakFixture));
    }
  );

  it('lets a user undo a resqueak for a fee', async () => {
    expect(await critter.getResqueakCount(squeakId)).to.eq(0);
  });

  it('deposits the undo resqueak fee into the treasury', async () => {
    expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
      PLATFORM_FEE
    );
  });

  it('emits a SqueakUnresqueaked event', async () => {
    await expect(undoResqueakTx)
      .to.emit(critter, 'SqueakUnresqueaked')
      .withArgs(ahmed.address, 0);
  });

  it('reverts if the user has not resqueaked the squeak', async () => {
    await expect(
      critter.connect(barbie).interact(squeakId, INTERACTION.UndoResqueak, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the undo resqueak fee is not sufficient', async () => {
    await expect(
      critter.interact(squeakId, INTERACTION.UndoResqueak, { value: 1 })
    ).to.be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.interact(420, INTERACTION.UndoResqueak, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).interact(squeakId, INTERACTION.UndoResqueak, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(
      critter.interact(squeakId, INTERACTION.UndoResqueak, {
        value: PLATFORM_FEE,
      })
    ).to.be.reverted;
  });
});

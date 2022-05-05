import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_FEE_PERCENT,
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

describe('resqueak', () => {
  let barbieStartingBalance: BigNumber;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let resqueakTx: ContractTransaction;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const resqueakFixture = async () => {
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
    const barbieStartingBalance = await barbie.getBalance();
    const treasuryStartingBalance = await critter.treasury();

    // ahmed creates an account resqueaks it
    await critter.createAccount('ahmed');
    const resqueakTx = (await critter.resqueak(squeakId, {
      value: PLATFORM_FEE,
    })) as ContractTransaction;

    return {
      barbieStartingBalance,
      critter,
      resqueakTx,
      squeakId,
      treasuryStartingBalance,
    };
  };

  beforeEach(
    'deploy test contract, barbie creates an account & posts a squeak which ahmed resqueaks',
    async () => {
      ({
        barbieStartingBalance,
        critter,
        resqueakTx,
        squeakId,
        treasuryStartingBalance,
      } = await loadFixture(resqueakFixture));
    }
  );

  // test variables
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(PLATFORM_FEE_PERCENT)
    .div(ethers.BigNumber.from(100));
  const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

  xit('lets a user resqueak someone for a fee', async () => {});

  it('deposits a portion of the resqueak fee into the treasury', async () => {
    expect((await critter.treasury()).sub(treasuryStartingBalance)).to.eq(
      treasuryFee
    );
  });

  it('transfers the remaining fee to the squeak owner', async () => {
    expect((await barbie.getBalance()).sub(barbieStartingBalance)).to.eq(
      transferAmount
    );
  });

  it('emits a Resqueaked event', async () => {
    await expect(resqueakTx)
      .to.emit(critter, 'Resqueaked')
      .withArgs(ahmed.address, squeakId);
  });

  it('reverts if the user has already resqueaked the squeak', async () => {
    await expect(critter.resqueak(squeakId, { value: PLATFORM_FEE })).to.be
      .reverted;
  });

  it('reverts when the like fee is not sufficient', async () => {
    await expect(critter.connect(barbie).resqueak(squeakId, { value: 1 })).to
      .be.reverted;
  });

  it('reverts when the squeak does not exist', async () => {
    await expect(
      critter.connect(barbie).resqueak(420, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(owner).resqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(
      critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});

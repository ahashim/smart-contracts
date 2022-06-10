import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  INTERACTION,
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

describe('withdraw', () => {
  let coldStorageBalance: BigNumber;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, coldStorage: Wallet;
  let withdrawTx: ContractTransaction;
  let squeakId: BigNumber;
  let treasuryBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, coldStorage] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([
      owner,
      ahmed,
      barbie,
      coldStorage,
    ]);
  });

  const withdrawFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(owner) as Critter;

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

    // ahmed creates an account likes it
    await critter.connect(ahmed).createAccount('ahmed');
    await critter
      .connect(ahmed)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    // snapshot balances
    const coldStorageBalance = (await coldStorage.getBalance()) as BigNumber;
    const treasuryBalance = (await critter.treasury()) as BigNumber;

    // owner withdraws everything from the treasury into cold storage wallet
    const withdrawTx = (await critter.withdraw(
      coldStorage.address,
      treasuryBalance
    )) as ContractTransaction;

    // barbie likes the squeak to refill treasury with a single fee amount
    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.Like, { value: PLATFORM_FEE });

    return {
      critter,
      coldStorageBalance,
      squeakId,
      treasuryBalance,
      withdrawTx,
    };
  };

  beforeEach(
    'deploy test contract, barbie creates an account & posts a squeak which ahmed withdraws',
    async () => {
      ({ coldStorageBalance, critter, squeakId, treasuryBalance, withdrawTx } =
        await loadFixture(withdrawFixture));
    }
  );

  // test variables
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(PLATFORM_TAKE_RATE)
    .div(ethers.BigNumber.from(100));

  it('lets an account with TREASURER_ROLE withdraw treasury funds to an address', async () => {
    expect(await critter.treasury()).to.eq(treasuryFee);
    expect((await coldStorage.getBalance()).sub(coldStorageBalance)).to.eq(
      treasuryBalance
    );
  });

  it('emits both FundsWithdrawn and FundsTransferred events', async () => {
    expect(withdrawTx)
      .to.emit(critter, 'FundsWithdrawn')
      .withArgs(coldStorage.address, treasuryBalance)
      .and.to.emit(critter, 'FundsTransferred')
      .withArgs(coldStorage.address, treasuryBalance);
  });

  it('reverts if the amount to withdraw is greater than what is available in the treasury', async () => {
    await expect(
      critter.withdraw(coldStorage.address, ethers.constants.MaxUint256)
    ).to.be.reverted;
  });

  it('reverts if a negative amount to withdraw is supplied', async () => {
    await expect(critter.withdraw(coldStorage.address, -1)).to.be.reverted;
  });

  it('reverts if someone other than TREASURER_ROLE tries to withdraw funds', async () => {
    await expect(
      critter.connect(ahmed).withdraw(coldStorage.address, treasuryFee)
    ).to.be.reverted;
  });
});

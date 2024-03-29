import { PLATFORM_TAKE_RATE, TREASURER_ROLE } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  ContractTransaction,
  Critter,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('withdraw', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    coldStorage: SignerWithAddress,
    coldStorageBalance: BigNumber,
    critter: Critter,
    squeakId: BigNumber,
    treasuryBalance: BigNumber,
    treasuryFee: number,
    withdrawTx: ContractTransaction;

  const withdrawFixture = async () => {
    [, ahmed, barbie, coldStorage] = await ethers.getSigners();
    ({ critter } = await run('initialize-contracts'));

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // barbie creates a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: barbie,
    }));

    // ahmed likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: ahmed,
      squeakId,
    });

    // snapshot balances
    const coldStorageBalance = (await coldStorage.getBalance()) as BigNumber;
    const treasuryBalance = (await critter.treasury()) as BigNumber;

    // calculate treasury fee
    const likeFee = (await critter.fees(Interaction.Like)) as BigNumber;
    treasuryFee = likeFee.toNumber() * (PLATFORM_TAKE_RATE / 100);

    // owner withdraws everything from the treasury into cold storage wallet
    const withdrawTx = (await critter.withdraw(
      coldStorage.address,
      treasuryBalance
    )) as ContractTransaction;

    // barbie likes the squeak to refill treasury with a single fee amount
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: barbie,
      squeakId,
    });

    return {
      critter,
      coldStorageBalance,
      squeakId,
      treasuryBalance,
      treasuryFee,
      withdrawTx,
    };
  };

  beforeEach(
    'load deployed contract fixture, barbie creates an account & posts a squeak which ahmed withdraws',
    async () => {
      ({
        coldStorageBalance,
        critter,
        squeakId,
        treasuryBalance,
        treasuryFee,
        withdrawTx,
      } = await loadFixture(withdrawFixture));
    }
  );

  it('lets an account with TREASURER_ROLE withdraw treasury funds to an address', async () => {
    expect(await critter.treasury()).to.eq(treasuryFee);
    expect((await coldStorage.getBalance()).sub(coldStorageBalance)).to.eq(
      treasuryBalance
    );
  });

  it('emits both FundsWithdrawn and FundsTransferred events', () => {
    expect(withdrawTx)
      .to.emit(critter, 'FundsWithdrawn')
      .withArgs(coldStorage.address, treasuryBalance)
      .and.to.emit(critter, 'FundsTransferred')
      .withArgs(coldStorage.address, treasuryBalance);
  });

  it('reverts if the amount to withdraw is greater than what is available in the treasury', async () => {
    await expect(
      critter.withdraw(coldStorage.address, ethers.constants.MaxUint256)
    ).to.be.revertedWithCustomError(critter, 'InvalidAmount');
  });

  it('reverts if someone other than the treasurer tries to withdraw funds', async () => {
    await expect(
      critter.connect(ahmed).withdraw(coldStorage.address, treasuryFee)
    ).to.be.revertedWith(
      `AccessControl: account ${ahmed.address.toLowerCase()} is missing role ${TREASURER_ROLE}`
    );
  });
});

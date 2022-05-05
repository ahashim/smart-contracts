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
  let ahmedStartingBalance: BigNumber, ahmedEndingBalance: BigNumber;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;
  let treasuryStartingBalance: BigNumber, treasuryEndingBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const resqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // creates accounts
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);
    const ahmedStartingBalance = await ahmed.getBalance();
    const treasuryStartingBalance = await critter.treasury();

    return {
      ahmedStartingBalance,
      critter,
      squeakId,
      treasuryStartingBalance,
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak',
    async () => {
      ({ ahmedStartingBalance, critter, squeakId, treasuryStartingBalance } =
        await loadFixture(resqueakFixture));
    }
  );

  // test variables
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(PLATFORM_FEE_PERCENT)
    .div(ethers.BigNumber.from(100));
  const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

  it('lets a user resqueak someone for a fee', async () => {
    await critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE });
  });

  it('deposits a portion of the resqueak fee into the treasury', async () => {
    await critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE });
    treasuryEndingBalance = await critter.treasury();
    expect(treasuryEndingBalance.sub(treasuryStartingBalance)).to.eq(
      treasuryFee
    );
  });

  it('transfers the remaining fee to the squeak owner', async () => {
    await critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE });
    ahmedEndingBalance = await ahmed.getBalance();
    expect(ahmedEndingBalance.sub(ahmedStartingBalance)).to.eq(transferAmount);
  });

  it('emits a Resqueaked event', async () => {
    await expect(
      critter.connect(barbie).resqueak(squeakId, { value: PLATFORM_FEE })
    )
      .to.emit(critter, 'Resqueaked')
      .withArgs(barbie.address, squeakId);
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

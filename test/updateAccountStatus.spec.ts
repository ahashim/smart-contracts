import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  BASE_TOKEN_URI,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
} from '../constants';
import { AccountStatus, Interaction } from '../enums';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import { Critter } from '../typechain-types/contracts';

describe('updateAccountStatus', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const updateAccountStatusFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        SCOUT_POOL_THRESHOLD,
        1, // low virality threshold
        SCOUT_BONUS,
        SCOUT_MAX_LEVEL,
      ])
    ).connect(owner) as Critter;

    // everybody creates an account
    [ahmed, barbie, carlos].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    tx = await critter.connect(ahmed).createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // barbie & carlos propel it into virality
    await critter.connect(barbie).interact(squeakId, Interaction.Resqueak, {
      value: await critter.getInteractionFee(Interaction.Resqueak),
    });
    await critter.connect(carlos).interact(squeakId, Interaction.Like, {
      value: await critter.getInteractionFee(Interaction.Like),
    });

    // moderator suspends ahmed & barbie, then bans carlos (harsh!)
    await critter.updateAccountStatus(ahmed.address, AccountStatus.Suspended);
    await critter.updateAccountStatus(barbie.address, AccountStatus.Suspended);
    await critter.updateAccountStatus(carlos.address, AccountStatus.Banned);

    // they reactivate ahmeds account (phew!)
    await critter
      .connect(owner)
      .updateAccountStatus(ahmed.address, AccountStatus.Active);

    return critter;
  };

  beforeEach('deploy test contract', async () => {
    critter = await loadFixture(updateAccountStatusFixture);
  });

  it('updates a users account status to active', async () => {
    expect((await critter.users(ahmed.address)).status).to.eq(
      AccountStatus.Active
    );
  });

  it('updates a users account status to suspended', async () => {
    expect((await critter.users(barbie.address)).status).to.eq(
      AccountStatus.Suspended
    );
  });

  it('updates a users account status to banned', async () => {
    expect((await critter.users(carlos.address)).status).to.eq(
      AccountStatus.Banned
    );
  });

  it('ejects a banned user from any scout pools they are a part of', async () => {
    const scouts = await critter.getScouts(squeakId);
    const [, shares] = await critter.getScoutPool(squeakId);

    // carlos is ejected from the scout pool after being banned
    expect(scouts.includes(carlos.address)).to.be.false;
    expect(scouts.length).to.eq(1);
    expect(scouts[0]).to.eq(barbie.address);

    // each scout was at level 2
    expect(shares).to.eq(2);
  });

  it('unmarks a squeak as viral, and deposits the remaining pool funds if there is nobody left', async () => {
    // assert pool amounts before banning
    const expectedPoolAmount = ethers.utils.parseEther('.00002');
    const treasuryBalance = await critter.treasury();
    let [amount, shares] = await critter.getScoutPool(squeakId);

    expect(await critter.isViral(squeakId)).to.be.true;
    expect(amount).to.eq(expectedPoolAmount);
    expect(shares).to.eq(2);

    // owner bans barbie, who is the last remaining member of the scout pool
    await critter.updateAccountStatus(barbie.address, AccountStatus.Banned);
    [amount, shares] = await critter.getScoutPool(squeakId);

    expect(amount).to.eq(0);
    expect(shares).to.eq(0);
    expect(await critter.isViral(squeakId)).to.be.false;
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      expectedPoolAmount
    );
  });

  it('emits an AccountStatusUpdated event', async () => {
    await expect(
      critter.updateAccountStatus(ahmed.address, AccountStatus.Suspended)
    )
      .to.emit(critter, 'AccountStatusUpdated')
      .withArgs(ahmed.address, AccountStatus.Suspended);
  });

  it('reverts when trying to update a users account status to non-existent', async () => {
    await expect(
      critter.updateAccountStatus(ahmed.address, AccountStatus.NonExistent)
    ).to.be.reverted;
  });

  it('reverts when trying to update a users account status to its already current status', async () => {
    await expect(
      critter.updateAccountStatus(ahmed.address, AccountStatus.Active)
    ).to.be.reverted;
  });

  it('reverts when users account does not exist', async () => {
    await expect(
      critter.updateAccountStatus(owner.address, AccountStatus.Banned)
    ).to.be.reverted;
  });
});

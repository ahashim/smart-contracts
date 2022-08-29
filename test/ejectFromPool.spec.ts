import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { PLATFORM_TAKE_RATE, MODERATOR_ROLE } from '../constants';
import { Interaction } from '../enums';

// types
import { BigNumber, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';
import { PoolInfo, Scout } from '../types';

describe.only('ejectFromPool', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let poolInfo: PoolInfo;
  let scouts: Scout[];
  let squeakId: BigNumber, treasuryBalance: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const ejectFromPoolFixture = async () => {
    // deploy contract with a lower virality threshold
    critter = (
      await run('deploy-contract', {
        viralityThreshold: 1,
      })
    ).connect(ahmed);

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // the owner grants ahmed the MODERATOR_ROLE
    await critter
      .connect(owner)
      .grantRole(ethers.utils.id(MODERATOR_ROLE), ahmed.address);

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // barbie likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: barbie,
      squeakId,
    });

    // carlos resqueaks it and propel it into virality, adding themselves and
    // barbie to the scout pool
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    // barbie ejects from the pool
    await critter.connect(barbie)['ejectFromPool(uint256)'](squeakId);

    return {
      critter,
      poolInfo: await critter.getPoolInfo(squeakId),
      scouts: await critter.getScouts(squeakId),
      treasuryBalance: await critter.treasury(),
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, poolInfo, scouts, treasuryBalance } = await loadFixture(
      ejectFromPoolFixture
    ));
  });

  it('ejects the user from a scout pool', async () => {
    const accounts = scouts.map((s) => s.account);

    expect(scouts.length).to.eq(1);
    expect(accounts.includes(barbie.address)).to.be.false;
    expect(accounts.includes(carlos.address)).to.be.true;
  });

  it('deletes the pool & removes it from virality when all members eject', async () => {
    let { amount, shares, memberCount } = poolInfo;

    // get expected pool amount after Carlos propels the squeak to virality
    const interactionFee = await critter.fees(Interaction.Like);
    const interactionTake = interactionFee.mul(PLATFORM_TAKE_RATE).div(100);
    const expectedPoolAmount = interactionFee.sub(interactionTake).div(2);

    // squeak is still viral, and pool exists
    expect(await critter.isViral(squeakId)).to.be.true;
    expect(amount).to.eq(expectedPoolAmount);
    expect(shares).to.eq(5);
    expect(memberCount).to.eq(1);

    // remaining member ejects
    await critter.connect(carlos)['ejectFromPool(uint256)'](squeakId);
    ({ amount, shares, memberCount } = await critter.getPoolInfo(squeakId));

    expect(amount).to.eq(0);
    expect(shares).to.eq(0);
    expect(memberCount).to.eq(0);
    expect(await critter.isViral(squeakId)).to.be.false;
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      expectedPoolAmount
    );
  });

  it('allows a moderator to eject a member from the pool', async () => {
    // moderator ejects the last member
    await critter['ejectFromPool(uint256,address)'](squeakId, carlos.address);
    const { amount, shares, memberCount } = await critter.getPoolInfo(
      squeakId
    );

    expect(amount).to.eq(0);
    expect(memberCount).to.eq(0);
    expect(shares).to.eq(0);
    expect(await critter.isViral(squeakId)).to.be.false;
  });

  it('reverts when the user is not a part of the pool', async () => {
    await expect(critter['ejectFromPool(uint256)'](squeakId)).to.be.reverted;
  });

  it('reverts when the pool does not exist', async () => {
    await expect(critter['ejectFromPool(uint256)'](420)).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    // pause the contract
    await critter.connect(owner).pause();

    await expect(critter.connect(carlos)['ejectFromPool(uint256)'](squeakId))
      .to.be.reverted;
  });
});

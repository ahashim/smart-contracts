import { ethers, expect, loadFixture, run } from './setup';
import { PLATFORM_TAKE_RATE, MODERATOR_ROLE } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  Critter,
  PoolInfo,
  Scout,
  SignerWithAddress,
} from '../types';

describe('ejectFromPool', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    poolInfo: PoolInfo,
    scouts: Scout[],
    squeakId: BigNumber,
    treasuryBalance: BigNumber;

  const ejectFromPoolFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
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
    await critter.connect(owner).grantRole(MODERATOR_ROLE, ahmed.address);

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // barbie likes it
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: barbie,
      squeakId,
    });

    // carlos resqueaks it and propel it into virality, adding themselves and
    // barbie to the scout pool
    await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
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

  it('ejects the user from a scout pool', () => {
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
    await expect(
      critter['ejectFromPool(uint256)'](squeakId)
    ).to.be.revertedWithCustomError(critter, 'NotInScoutPool');
  });

  it('reverts when the pool does not exist', async () => {
    await expect(
      critter['ejectFromPool(uint256)'](420)
    ).to.be.revertedWithCustomError(critter, 'ScoutPoolDoesNotExist');
  });
});

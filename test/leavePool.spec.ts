import { MODERATOR_ROLE, PLATFORM_TAKE_RATE } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  ContractTransaction,
  Critter,
  PoolInfo,
  PoolPassInfo,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('leavePool', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    poolInfo: PoolInfo,
    poolPasses: PoolPassInfo[],
    squeakId: BigNumber,
    treasuryBalance: BigNumber,
    tx: ContractTransaction;

  const leavePoolFixture = async () => {
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

    // carlos resqueaks it and propels it into virality, thus adding themselves
    // and barbie to the pool
    tx = await run('interact', {
      contract: critter,
      interaction: Interaction.Resqueak,
      signer: carlos,
      squeakId,
    });

    // barbie leaves the pool
    await critter.connect(barbie).leavePool(squeakId);

    return {
      critter,
      poolInfo: await critter.getPoolInfo(squeakId),
      poolPasses: await critter.getPoolPasses(squeakId),
      treasuryBalance: await critter.treasury(),
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, poolInfo, poolPasses, treasuryBalance, tx } =
      await loadFixture(leavePoolFixture));
  });

  it('lets a user leave the pool', () => {
    const users = poolPasses.map((p) => p.account);

    expect(poolPasses.length).to.eq(1);
    expect(users.includes(barbie.address)).to.be.false;
    expect(users.includes(carlos.address)).to.be.true;
  });

  it('deletes the pool & removes it from virality when all members leave', async () => {
    let { amount, blockNumber, passCount, shares, score } = poolInfo;

    // get expected pool amount after Carlos propels the squeak to virality
    const interactionFee = await critter.fees(Interaction.Like);
    const interactionTake = interactionFee.mul(PLATFORM_TAKE_RATE).div(100);
    const expectedPoolAmount = interactionFee.sub(interactionTake).div(2);

    // squeak is still viral, and pool exists
    expect(await critter.isViral(squeakId)).to.be.true;
    expect(amount).to.eq(expectedPoolAmount);
    expect(blockNumber).to.eq(tx.blockNumber);
    expect(shares).to.eq(5);
    expect(passCount).to.eq(1);
    expect(score).to.eq(83);

    // remaining member leaves
    await critter.connect(carlos).leavePool(squeakId);
    ({ amount, blockNumber, shares, passCount, score } =
      await critter.getPoolInfo(squeakId));

    expect(amount).to.eq(0);
    expect(blockNumber).to.eq(0);
    expect(shares).to.eq(0);
    expect(passCount).to.eq(0);
    expect(score).to.eq(0);
    expect(await critter.isViral(squeakId)).to.be.false;
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      expectedPoolAmount
    );
  });

  it('reverts when the user is not a part of the pool', async () => {
    await expect(critter.leavePool(squeakId)).to.be.revertedWithCustomError(
      critter,
      'NotInPool'
    );
  });

  it('reverts when the pool does not exist', async () => {
    await expect(critter.leavePool(420)).to.be.revertedWithCustomError(
      critter,
      'PoolDoesNotExist'
    );
  });
});

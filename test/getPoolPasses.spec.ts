import { Interaction } from '../enums';
import type {
  BigNumber,
  BigNumberObject,
  Critter,
  PoolPassInfo,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('getPoolPasses', () => {
  let addresses: string[],
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    levels: BigNumberObject,
    passes: PoolPassInfo[],
    squeakId: BigNumber;

  const getPoolPassesFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    // deploy contract with a lower virality threshold
    ({ critter } = await run('initialize-contracts', {
      viralityThreshold: 1,
    }));

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed & barbie resqueak it
    [ahmed, barbie].forEach(async (signer) => {
      await run('interact', {
        contract: critter,
        interaction: Interaction.Resqueak,
        signer,
        squeakId,
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId,
    });

    // get passes
    passes = await critter.getPoolPasses(squeakId);

    return {
      addresses: passes.map((s) => s.account),
      levels: {
        [ahmed.address]: (await critter.users(ahmed.address)).level,
        [barbie.address]: (await critter.users(barbie.address)).level,
        [carlos.address]: (await critter.users(carlos.address)).level,
      },
      passes,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ addresses, levels, passes } = await loadFixture(getPoolPassesFixture));
  });

  it('returns the addresses for all users in the pool', () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(addresses.includes(user.address)).to.be.true;
    });
  });

  it('returns the amount of shares every user in the pool has at the time of virality', () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(passes.find((s) => s.account === user.address)?.shares).to.eq(
        levels[user.address]
      );
    });
  });
});

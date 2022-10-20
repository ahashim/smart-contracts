import { ethers, expect, loadFixture, run } from './setup';
import { Interaction } from '../enums';
import type {
  BigNumberObject,
  BigNumber,
  Critter,
  Scout,
  SignerWithAddress,
} from '../types';

describe('getScouts', () => {
  let addresses: string[],
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    levels: BigNumberObject,
    scouts: Scout[],
    squeakId: BigNumber;

  const getScoutsFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    // deploy contract with a lower virality threshold
    critter = (
      await run('deploy-contract', {
        viralityThreshold: 1,
      })
    ).connect(ahmed);

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

    // get scouts
    scouts = await critter.getScouts(squeakId);

    return {
      addresses: scouts.map((s) => s.account),
      levels: {
        [ahmed.address]: (await critter.users(ahmed.address)).scoutLevel,
        [barbie.address]: (await critter.users(barbie.address)).scoutLevel,
        [carlos.address]: (await critter.users(carlos.address)).scoutLevel,
      },
      scouts,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ addresses, levels, scouts } = await loadFixture(getScoutsFixture));
  });

  it('returns the addresses for all scouts in the pool', async () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(addresses.includes(user.address)).to.be.true;
    });
  });

  it('returns the amount of shares every scout in the pool has at the time of virality', async () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(scouts.find((s) => s.account === user.address)?.shares).to.eq(
        levels[user.address]
      );
    });
  });
});

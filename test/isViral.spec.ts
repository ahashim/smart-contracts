import { Interaction } from '../enums';
import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('isViral', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    nonViralSqueakId: BigNumber,
    viralSqueakId: BigNumber;

  const isViralFixture = async () => {
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

    // ahmed creates a squeak
    ({ squeakId: viralSqueakId } = await run('create-squeak', {
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
        squeakId: viralSqueakId,
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    await run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId: viralSqueakId,
    });

    ({ squeakId: nonViralSqueakId } = await run('create-squeak', {
      content: 'i like turtles',
      contract: critter,
      signer: carlos,
    }));

    return { critter, nonViralSqueakId, viralSqueakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, nonViralSqueakId, viralSqueakId } = await loadFixture(
      isViralFixture
    ));
  });

  it('returns true when a squeak is viral', async () => {
    expect(await critter.isViral(viralSqueakId)).to.be.true;
  });

  it('returns false when a squeak is not viral', async () => {
    expect(await critter.isViral(nonViralSqueakId)).to.be.false;
  });

  it('returns false when the squeak does not exist', async () => {
    expect(await critter.isViral(420)).to.be.false;
  });
});

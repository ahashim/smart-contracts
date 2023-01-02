import { PLATFORM_FEE } from '../constants';
import { Interaction } from '../enums';
import type { BigNumberObject, Critter } from '../types';
import { expect, loadFixture, run } from './setup';

describe('fees', () => {
  let critter: Critter, fees: BigNumberObject;

  const feesFixture = async () => {
    critter = (await run('deploy-critter-contract')).critter;

    return {
      critter,
      fees: {
        dislike: await critter.fees(Interaction.Dislike),
        like: await critter.fees(Interaction.Like),
        resqueak: await critter.fees(Interaction.Resqueak),
        undoLike: await critter.fees(Interaction.UndoLike),
        undoDislike: await critter.fees(Interaction.UndoDislike),
        UndoResqueak: await critter.fees(Interaction.UndoResqueak),
      },
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, fees } = await loadFixture(feesFixture));
  });

  it('gets the dislike fee', () => {
    expect(fees.dislike).to.eq(PLATFORM_FEE);
  });

  it('gets the like fee', () => {
    expect(fees.like).to.eq(PLATFORM_FEE);
  });

  it('gets the resqueak fee', () => {
    expect(fees.resqueak).to.eq(PLATFORM_FEE);
  });

  it('gets the undo dislike fee', () => {
    expect(fees.undoDislike).to.eq(PLATFORM_FEE);
  });

  it('gets the undo like fee', () => {
    expect(fees.undoLike).to.eq(PLATFORM_FEE);
  });

  it('gets the undo resqueak fee', () => {
    expect(fees.UndoResqueak).to.eq(PLATFORM_FEE);
  });
});

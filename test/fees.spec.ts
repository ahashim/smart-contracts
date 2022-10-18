import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { PLATFORM_FEE } from '../constants';
import { Interaction } from '../enums';

// types
import type { Critter } from '../typechain-types/contracts';
import type { BigNumberObject } from '../types';

describe('fees', () => {
  let critter: Critter, fees: BigNumberObject;

  const feesFixture = async () => {
    critter = await hardhat.run('deploy-contract');

    return {
      critter,
      fees: {
        delete: await critter.fees(Interaction.Delete),
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

  it('gets the base delete fee', async () => {
    expect(fees.delete).to.eq(PLATFORM_FEE);
  });

  it('gets the dislike fee', async () => {
    expect(fees.dislike).to.eq(PLATFORM_FEE);
  });

  it('gets the like fee', async () => {
    expect(fees.like).to.eq(PLATFORM_FEE);
  });

  it('gets the resqueak fee', async () => {
    expect(fees.resqueak).to.eq(PLATFORM_FEE);
  });

  it('gets the undo dislike fee', async () => {
    expect(fees.undoDislike).to.eq(PLATFORM_FEE);
  });

  it('gets the undo like fee', async () => {
    expect(fees.undoLike).to.eq(PLATFORM_FEE);
  });

  it('gets the undo resqueak fee', async () => {
    expect(fees.UndoResqueak).to.eq(PLATFORM_FEE);
  });
});

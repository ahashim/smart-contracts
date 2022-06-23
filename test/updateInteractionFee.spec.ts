import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  INTERACTION,
  TREASURER_ROLE,
} from '../constants';

// types
import type { Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateInteractionFee', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  // test variables
  const updatedFee = ethers.utils.parseEther('0.000025');

  const updateInteractionFeeFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // the owner grants ahmed the TREASURER_ROLE
    await critter
      .connect(owner)
      .grantRole(ethers.utils.id(TREASURER_ROLE), ahmed.address);

    // ahmed updates the interaction fee for "like"
    await critter.updateInteractionFee(INTERACTION.Like, updatedFee);

    return {
      critter,
      dislikeFee: await critter.getInteractionFee(INTERACTION.Dislike),
    };
  };

  beforeEach(
    'deploy test contract, ahmed creates a squeak which is interacted with',
    async () => {
      ({ critter } = await loadFixture(updateInteractionFeeFixture));
    }
  );

  it('allows TREASURER_ROLE to update an interaction fee', async () => {
    expect(await critter.getInteractionFee(INTERACTION.Like)).to.eq(
      updatedFee
    );
  });

  it('reverts when trying to update an invalid interaction', async () => {
    await expect(critter.updateInteractionFee(420, updatedFee)).to.be.reverted;
  });
});

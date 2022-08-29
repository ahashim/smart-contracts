import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { TREASURER_ROLE, PLATFORM_FEE } from '../constants';
import { Interaction } from '../enums';

// types
import { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateInteractionFee', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;

  // test variables
  const updatedFee = ethers.utils.parseEther('0.0001');

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const updateInteractionFeeFixture = async () => {
    // deploy contract as owner
    critter = (await run('deploy-contract')).connect(owner);

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // the owner grants ahmed the TREASURER_ROLE
    await critter.grantRole(ethers.utils.id(TREASURER_ROLE), ahmed.address);

    // ahmed increases the interaction fee for "like"
    await critter.updateInteractionFee(Interaction.Like, updatedFee);

    // barbie posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: barbie,
    }));

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed updates the price',
    async () => {
      ({ critter, squeakId } = await loadFixture(updateInteractionFeeFixture));
    }
  );

  it('allows TREASURER_ROLE to update an interaction fee', async () => {
    expect(await critter.fees(Interaction.Like)).to.eq(updatedFee);
  });

  it('reverts when trying to update an invalid interaction', async () => {
    await expect(critter.updateInteractionFee(420, updatedFee)).to.be.reverted;
  });

  it('reverts when someone other than the TREASURER_ROLE tries to update an interaction fee', async () => {
    await expect(critter.connect(barbie).updateInteractionFee(420, updatedFee))
      .to.be.reverted;
  });

  it('reverts when interacting with the original platform fee', async () => {
    await expect(
      critter
        .connect(barbie)
        .interact(squeakId, Interaction.Like, { value: PLATFORM_FEE })
    ).to.be.reverted;
  });
});

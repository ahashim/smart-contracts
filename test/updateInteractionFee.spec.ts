import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  TREASURER_ROLE,
  PLATFORM_FEE,
} from '../constants';
import { Interaction } from '../enums';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('updateInteractionFee', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber, updatedFee: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const updateInteractionFeeFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // the owner grants ahmed the TREASURER_ROLE
    await critter
      .connect(owner)
      .grantRole(ethers.utils.id(TREASURER_ROLE), ahmed.address);

    // ahmed increases the interaction fee for "like" (note: critter account not
    // required to update contract fees)
    const updatedFee = ethers.utils.parseEther('0.0001');
    await critter.updateInteractionFee(Interaction.Like, updatedFee);

    // barbie creates an account & posts a squeak
    await critter.connect(barbie).createAccount('barbie');
    const tx = (await critter
      .connect(barbie)
      .createSqueak('hello blockchain!')) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    return { critter, squeakId, updatedFee };
  };

  beforeEach('load deployed contract fixture, ahmed updates the price', async () => {
    ({ critter, squeakId, updatedFee } = await loadFixture(
      updateInteractionFeeFixture
    ));
  });

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

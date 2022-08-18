import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

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
import type { Squeak } from '../types';

describe('transferFrom', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeak: Squeak;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const transferFromFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // creates accounts
    await critter.createAccount('ahmed');
    await critter.connect(barbie).createAccount('barbie');

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // approve barbie to transfer it
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak then approves barbie to transfer it',
    async () => {
      ({ critter, squeakId } = await loadFixture(transferFromFixture));
    }
  );

  it('lets an owner transfer a token to another user', async () => {
    await critter.transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await critter.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('lets an approved user transfer a token to another user', async () => {
    await critter
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await critter.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('reassigns squeak ownership once the token has been transferred', async () => {
    await critter.transferFrom(ahmed.address, barbie.address, squeakId);
    squeak = await critter.squeaks(squeakId);
    expect(squeak.owner).to.eq(barbie.address);
  });

  it('reverts if transferring from a zero address', async () => {
    await expect(
      critter.transferFrom(
        ethers.constants.AddressZero,
        barbie.address,
        squeakId
      )
    ).to.be.reverted;
  });

  it('reverts if transferring to a zero address', async () => {
    await expect(
      critter.transferFrom(
        ahmed.address,
        ethers.constants.AddressZero,
        squeakId
      )
    ).to.be.reverted;
  });

  it('reverts if the squeak is not owned by the "from" address', async () => {
    await expect(critter.transferFrom(owner.address, barbie.address, squeakId))
      .to.be.reverted;
  });

  it('reverts if the caller is not approved or an owner of the squeak being transferred', async () => {
    await expect(
      critter
        .connect(owner)
        .transferFrom(ahmed.address, barbie.address, squeakId)
    ).to.be.reverted;
  });
});

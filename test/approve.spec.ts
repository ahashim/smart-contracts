import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import { ethers, upgrades, waffle } from 'hardhat';
import { expect } from 'chai';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';
import { Critter } from '../typechain-types/contracts';

describe('approve', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const approveFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // barbie creates an account
    critter.connect(barbie).createAccount('barbie');

    // ahmed creates an account & posts a squeak
    await critter.createAccount('ahmed');
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, barbie & ahmed create an accounts, and ahmed posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(approveFixture));
    }
  );

  it('lets a user approve another account to manage a squeak', async () => {
    await critter.approve(barbie.address, squeakId);
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('sets the approver back to the zero address after transferring a squeak', async () => {
    await critter.approve(barbie.address, squeakId);
    await critter
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);

    expect(await critter.getApproved(squeakId)).to.eq(
      ethers.constants.AddressZero
    );
  });

  it('reverts if someone other than the owner tries to approve the squeak', async () => {
    await expect(critter.connect(barbie).approve(ahmed.address, squeakId)).to
      .be.reverted;
  });
});

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

describe('getApproved', () => {
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

    // barbie creates an account
    critter.connect(barbie).createAccount('barbie');

    // ahmed approves barbie for it
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, barbie & ahmed create an accounts, ahmed posts a squeak and approves barbie to transfer it',
    async () => {
      ({ critter, squeakId } = await loadFixture(approveFixture));
    }
  );

  it('returns the account approved to manage a squeak', async () => {
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getApproved(420)).to.be.reverted;
  });
});

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

describe('balanceOf', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const balanceOfFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
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

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(balanceOfFixture));
    }
  );

  it('lets a user get a balance of their squeaks', async () => {
    expect(await critter.balanceOf(ahmed.address)).to.eq(1);
  });

  it('returns zero when looking up the balance of a non-existent account', async () => {
    expect(await critter.balanceOf(owner.address)).to.eq(0);
  });

  it('reverts when getting the balance of the zero address', async () => {
    await expect(critter.balanceOf(ethers.constants.AddressZero)).to.be
      .reverted;
  });
});

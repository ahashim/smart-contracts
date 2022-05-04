import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('squeaks', () => {
  let blockAuthored: number;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;
  let squeak: Squeak;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const squeaksFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // create account & post a squeak
    await critter.createAccount('ahmed');
    const tx = (await critter.createSqueak(content)) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);
    const blockAuthored = receipt.blockNumber;

    return { blockAuthored, critter, squeakId };
  };

  beforeEach(
    'deploy test contract, and ahmed creates an account',
    async () => {
      ({ blockAuthored, critter, squeakId } = await loadFixture(
        squeaksFixture
      ));
    }
  );

  // test variables
  const content = 'hello blockcain!';

  it('returns a squeak using a squeakId', async () => {
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(blockAuthored);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(content);
  });

  it('returns an empty squeak for a non-existent squeakId', async () => {
    squeak = await critter.squeaks(420);

    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq('');
  });

  it('reverts if the squeakId is out of bounds', async () => {
    const overflow = ethers.constants.MaxUint256.add(ethers.BigNumber.from(1));
    await expect(critter.squeaks(-1)).to.be.reverted;
    await expect(critter.squeaks(overflow)).to.be.reverted;
  });
});

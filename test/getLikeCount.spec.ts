import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
} from '../constants';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('getLikeCount', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let receipt: ContractReceipt;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const getLikeCountFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // ahmed creates an account & posts a squeak
    await critter.createAccount('ahmed');
    tx = await critter.createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed likes it
    await critter.likeSqueak(squeakId, { value: PLATFORM_FEE });
    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates an account & posts a squeak then dislikes it',
    async () => {
      ({ critter, squeakId } = await loadFixture(getLikeCountFixture));
    }
  );

  // test variables
  const overflow = ethers.constants.MaxUint256.add(ethers.BigNumber.from(1));

  it('gets the like count of a squeak', async () => {
    expect(await critter.getLikeCount(squeakId)).to.equal(1);
  });

  it('returns zero when querying for a nonexistent squeak', async () => {
    expect(await critter.getLikeCount(420)).to.equal(0);
  });

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.getLikeCount(-1)).to.be.reverted;
    await expect(critter.getLikeCount(overflow)).to.be.reverted;
  });
});

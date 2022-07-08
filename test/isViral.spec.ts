import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
  SCOUT_POOL_THRESHOLD,
} from '../constants';
import { Interaction } from '../enums';

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

describe('isViral', () => {
  let critter: Critter;
  let squeakId: BigNumber;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const isViralFixture = async () => {
    // deploy contract with a lower virality threshold for testing
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        SCOUT_POOL_THRESHOLD,
        1, // virality threshold
        SCOUT_BONUS,
        SCOUT_MAX_LEVEL,
      ])
    ).connect(ahmed) as Critter;

    // creates accounts
    [ahmed, barbie, carlos].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed & barbie resqueak it
    [ahmed, barbie].forEach(async (account) => {
      await critter.connect(account).interact(squeakId, Interaction.Resqueak, {
        value: await critter.fees(Interaction.Resqueak),
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    await critter.connect(carlos).interact(squeakId, Interaction.Like, {
      value: await critter.fees(Interaction.Like),
    });

    return { critter, squeakId };
  };

  beforeEach('deploy test contract', async () => {
    ({ critter, squeakId } = await loadFixture(isViralFixture));
  });

  it('returns the viral status of a squeak', async () => {
    expect(await critter.isViral(squeakId)).to.be.true;
  });

  it('reverts when looking up a non-existent squeak', async () => {
    await expect(critter.isViral(420)).to.be.reverted;
  });
});

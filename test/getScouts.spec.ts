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
import type { BigNumberObject, Scout } from '../types';

describe('getScouts', () => {
  let addresses: string[];
  let critter: Critter;
  let squeakId: BigNumber;
  let levels: BigNumberObject;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let scouts: Scout[];

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getScoutsFixture = async () => {
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

    // get scouts
    scouts = await critter.getScouts(squeakId);

    return {
      addresses: scouts.map((s) => s.account),
      levels: {
        [ahmed.address]: (await critter.users(ahmed.address)).scoutLevel,
        [barbie.address]: (await critter.users(barbie.address)).scoutLevel,
        [carlos.address]: (await critter.users(carlos.address)).scoutLevel,
      },
      scouts,
    };
  };

  beforeEach('deploy test contract', async () => {
    ({ addresses, levels, scouts } = await loadFixture(getScoutsFixture));
  });

  it('returns the addresses for all scouts in the pool', async () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(addresses.includes(user.address)).to.be.true;
    });
  });

  it('returns the amount of shares every scout in the pool has at the time of virality', async () => {
    [ahmed, barbie, carlos].forEach((user) => {
      expect(scouts.find((s) => s.account === user.address)?.shares).to.eq(
        levels[user.address]
      );
    });
  });
});

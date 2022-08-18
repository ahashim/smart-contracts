import { expect } from 'chai';
import { ethers, waffle, upgrades } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  BASE_TOKEN_URI,
} from '../constants';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import { Critter } from '../typechain-types/contracts';

describe('tokenURI', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const tokenURIFixture = async () => {
    // deploy contract
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // create account
    await critter.createAccount('ahmed');

    // post squeak
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

  beforeEach('load deployed contract fixture, and ahmed creates a squeak', async () => {
    ({ critter, squeakId } = await loadFixture(tokenURIFixture));
  });

  it('returns the URI of a squeak', async () => {
    expect(await critter.tokenURI(squeakId)).to.eq(BASE_TOKEN_URI + squeakId);
  });

  it('reverts when querying for a non-existent squeak', async () => {
    await expect(critter.tokenURI(420)).to.be.reverted;
  });
});

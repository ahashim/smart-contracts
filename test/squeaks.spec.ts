import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { EMPTY_BYTE_STRING, OVERFLOW } from '../constants';

// types
import type { BigNumber, ContractReceipt, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('squeaks', () => {
  let blockAuthored: number;
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let receipt: ContractReceipt;
  let squeakId: BigNumber;
  let squeak: Squeak;

  // test variables
  const { utils } = ethers;
  const content = 'hello blockchain!';

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const squeaksFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed) as Critter;

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    ({ receipt, squeakId } = await run('create-squeak', {
      content,
      contract: critter,
      signer: ahmed,
    }));

    return {
      blockAuthored: receipt.blockNumber,
      critter,
      squeakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account',
    async () => {
      ({ blockAuthored, critter, squeakId } = await loadFixture(
        squeaksFixture
      ));
    }
  );

  it('returns a squeak using a squeakId', async () => {
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(blockAuthored);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(utils.hexlify(utils.toUtf8Bytes(content)));
  });

  it('returns an empty squeak for a non-existent squeakId', async () => {
    squeak = await critter.squeaks(420);

    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.squeaks(-1)).to.be.reverted;
    await expect(critter.squeaks(OVERFLOW)).to.be.reverted;
  });
});

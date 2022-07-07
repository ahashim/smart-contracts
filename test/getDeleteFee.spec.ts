import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
} from '../constants';

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

describe('getDeleteFee', () => {
  let blockAuthored: BigNumber, squeakId: BigNumber;
  let critter: Critter;
  let expectedFee: number, latestBlock: number;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const getDeleteFeeFixture = async () => {
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
      ({ critter, squeakId } = await loadFixture(getDeleteFeeFixture));
    }
  );

  it('calculates a delete fee for a squeak based on when it was created', async () => {
    ({ blockNumber: blockAuthored } = await critter.squeaks(squeakId));
    ({ number: latestBlock } = await ethers.provider.getBlock('latest'));
    const defaultConfirmationThreshold = 6;
    expectedFee =
      (latestBlock + defaultConfirmationThreshold - blockAuthored.toNumber()) *
      PLATFORM_FEE.toNumber();

    expect(await critter.getDeleteFee(squeakId)).to.eq(expectedFee);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getDeleteFee(420)).to.be.reverted;
  });
});

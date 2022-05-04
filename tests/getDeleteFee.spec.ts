import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_INITIALIZER,
  PLATFORM_FEE,
  BLOCK_CONFIRMATION_THRESHOLD,
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
  let blockAuthored: BigNumber, expectedFee: BigNumber;
  let critter: Critter;
  let latestBlock: number;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const getDeleteFeeFixture = async () => {
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
    expectedFee = ethers.BigNumber.from(latestBlock)
      .add(BLOCK_CONFIRMATION_THRESHOLD)
      .sub(blockAuthored)
      .mul(PLATFORM_FEE);

    expect(
      await critter.getDeleteFee(squeakId, BLOCK_CONFIRMATION_THRESHOLD)
    ).to.eq(expectedFee);
  });

  it('reverts when passing an invalid block confirmation threshold', async () => {
    await expect(critter.getDeleteFee(squeakId, -69)).to.be.reverted;
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getDeleteFee(420, BLOCK_CONFIRMATION_THRESHOLD)).to.be
      .reverted;
  });
});
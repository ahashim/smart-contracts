import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { EMPTY_BYTE_STRING } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber, ContractReceipt } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('squeaks', () => {
  const content = 'hello blockchain!';
  const rawContent = hardhat.ethers.utils.hexlify(
    hardhat.ethers.utils.toUtf8Bytes(content)
  );

  let critter: Critter,
    ahmed: SignerWithAddress,
    receipt: ContractReceipt,
    squeakId: BigNumber,
    squeak: Squeak;

  const squeaksFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    ({ receipt, squeakId } = await hardhat.run('create-squeak', {
      content,
      contract: critter,
      signer: ahmed,
    }));

    return {
      critter,
      receipt,
      squeakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account',
    async () => {
      ({ critter, receipt, squeakId } = await loadFixture(squeaksFixture));
    }
  );

  it('returns a squeak using a squeakId', async () => {
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('returns an empty squeak for an unknown squeakId', async () => {
    squeak = await critter.squeaks(420);

    expect(squeak.blockNumber).to.eq(0);
    expect(squeak.author).to.eq(hardhat.ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(hardhat.ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });
});

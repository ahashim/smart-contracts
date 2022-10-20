import { ethers, expect, loadFixture, run } from './setup';
import { EMPTY_BYTE_STRING } from '../constants';
import type {
  BigNumber,
  ContractReceipt,
  Critter,
  SignerWithAddress,
  Squeak,
} from '../types';

describe('squeaks', () => {
  const content = 'hello blockchain!';
  const rawContent = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(content));

  let critter: Critter,
    ahmed: SignerWithAddress,
    receipt: ContractReceipt,
    squeakId: BigNumber,
    squeak: Squeak;

  const squeaksFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed creates a squeak
    ({ receipt, squeakId } = await run('create-squeak', {
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
    expect(squeak.author).to.eq(ethers.constants.AddressZero);
    expect(squeak.owner).to.eq(ethers.constants.AddressZero);
    expect(squeak.content).to.eq(EMPTY_BYTE_STRING);
  });
});

import { EMPTY_BYTE_STRING } from '../constants';
import type {
  BigNumber,
  ContractReceipt,
  Critter,
  SignerWithAddress,
  Squeak,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('squeaks', () => {
  const content = 'hello blockchain!';
  const rawContent = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(content));

  let critter: Critter,
    ahmed: SignerWithAddress,
    receipt: ContractReceipt,
    invalidSqueak: Squeak,
    squeak: Squeak,
    squeakable: Squeakable,
    squeakId: BigNumber;

  const squeaksFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed creates an account
    await critter.connect(ahmed).createAccount('ahmed');

    // ahmed creates a squeak
    ({ receipt, squeakId } = await run('create-squeak', {
      content,
      contract: critter,
      signer: ahmed,
    }));

    return {
      critter,
      receipt,
      invalidSqueak: await squeakable.squeaks(420),
      squeak: await squeakable.squeaks(squeakId),
      squeakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account',
    async () => {
      ({ critter, receipt, invalidSqueak, squeak, squeakId } =
        await loadFixture(squeaksFixture));
    }
  );

  it('returns a squeak using a squeakId', () => {
    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('returns an empty squeak for an unknown squeakId', () => {
    expect(invalidSqueak.blockNumber).to.eq(0);
    expect(invalidSqueak.author).to.eq(ethers.constants.AddressZero);
    expect(invalidSqueak.content).to.eq(EMPTY_BYTE_STRING);
  });
});

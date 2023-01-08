import type {
  BigNumber,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('ownerOf', () => {
  let critter: Critter,
    ahmed: SignerWithAddress,
    squeakable: Squeakable,
    squeakId: BigNumber;

  const ownerOfFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed creates an account
    await critter.connect(ahmed).createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return { squeakable, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak',
    async () => {
      ({ squeakable, squeakId } = await loadFixture(ownerOfFixture));
    }
  );

  it('gets the owner address of a squeak', async () => {
    expect(await squeakable.ownerOf(squeakId)).to.equal(ahmed.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(squeakable.ownerOf(420)).to.be.reverted;
  });
});

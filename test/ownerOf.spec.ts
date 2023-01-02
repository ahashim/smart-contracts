import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('ownerOf', () => {
  let critter: Critter, ahmed: SignerWithAddress, squeakId: BigNumber;

  const ownerOfFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    const critter = (await run('deploy-critter-contract')).critter.connect(
      ahmed
    );

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(ownerOfFixture));
    }
  );

  it('gets the owner address of a squeak', async () => {
    expect(await critter.ownerOf(squeakId)).to.equal(ahmed.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.ownerOf(420)).to.be.reverted;
  });
});

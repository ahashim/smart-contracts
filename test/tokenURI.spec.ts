import { ethers, expect, loadFixture, run } from './setup';
import { BASE_TOKEN_URI } from '../constants';
import type { BigNumber, Critter, SignerWithAddress } from '../types';

describe('tokenURI', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    squeakId: BigNumber,
    tokenURI: string;

  const tokenURIFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    const critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return {
      critter,
      squeakId,
      tokenURI: await critter.tokenURI(squeakId),
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates a squeak',
    async () => {
      ({ critter, squeakId, tokenURI } = await loadFixture(tokenURIFixture));
    }
  );

  it('returns the URI of a squeak', () => {
    expect(tokenURI).to.eq(BASE_TOKEN_URI + squeakId);
  });

  it('reverts when querying for an unknown squeak', async () => {
    await expect(critter.tokenURI(420)).to.be.reverted;
  });
});

import { BASE_TOKEN_URI } from '../constants';
import type {
  BigNumber,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('tokenURI', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable,
    squeakId: BigNumber,
    tokenURI: string;

  const tokenURIFixture = async () => {
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

    return {
      squeakable,
      squeakId,
      tokenURI: await squeakable.tokenURI(squeakId),
    };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates a squeak',
    async () => {
      ({ squeakable, squeakId, tokenURI } = await loadFixture(
        tokenURIFixture
      ));
    }
  );

  it('returns the URI of a squeak', () => {
    expect(tokenURI).to.eq(BASE_TOKEN_URI + squeakId);
  });

  it('reverts when querying for an unknown squeak', async () => {
    await expect(squeakable.tokenURI(420)).to.be.reverted;
  });
});

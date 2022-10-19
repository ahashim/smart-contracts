import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { BASE_TOKEN_URI } from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('tokenURI', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    squeakId: BigNumber,
    tokenURI: string;

  const tokenURIFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
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

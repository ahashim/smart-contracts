// libraries
import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import {
  twoAccountsOneDislikedSqueak,
  twoAccountsOneLikedSqueak,
} from './fixtures';
import { PLATFORM_FEE } from '../constants';

// types
import { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Interactions', () => {
  let contract: Contract;
  let barbie: SignerWithAddress;
  let tokenId: number;

  describe('one disliked squeak', () => {
    beforeEach(
      ` Deploy contracts.
        Create accounts for Ahmed & Barbie.
        Ahmed posts a squeak.
        Barbie dislikes Ahmed's squeak`,
      async () => {
        [contract, tokenId] = await waffle.loadFixture(
          twoAccountsOneDislikedSqueak
        );
        [, , barbie] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('does not let a user dislike a squeak twice', async () => {
      // assert it reverts when barbie dislikes it again
      await expect(
        contract
          .connect(barbie)
          .dislikeSqueak(tokenId, { value: PLATFORM_FEE })
      ).to.be.revertedWith('Critter: cannot dislike a squeak twice');
    });

    it('removes a previous dislike when liking a squeak', async () => {
      // assert sentiment: 1 dislikes, 0 likes
      expect(await contract.getDislikeCount(tokenId)).to.equal(1);
      expect(await contract.getLikeCount(tokenId)).to.equal(0);

      // barbie changes her mind and likes the squeak instead
      await run('likeSqueak', {
        contract,
        signer: barbie,
        tokenId,
      });

      // assert sentiment: 0 dislikes, 1 likes
      expect(await contract.getDislikeCount(tokenId)).to.equal(0);
      expect(await contract.getLikeCount(tokenId)).to.equal(1);
    });
  });

  describe('one liked squeak', () => {
    beforeEach(
      ` Deploy contracts.
        Create accounts for Ahmed & Barbie.
        Ahmed posts a squeak.
        Barbie likes Ahmed's squeak`,
      async () => {
        [contract, tokenId] = await waffle.loadFixture(
          twoAccountsOneLikedSqueak
        );
        [, , barbie] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('does not let a user like a squeak twice', async () => {
      // assert it reverts when barbie likes it again
      await expect(
        contract.connect(barbie).likeSqueak(tokenId, { value: PLATFORM_FEE })
      ).to.be.revertedWith('Critter: cannot like a squeak twice');
    });

    it('removes a previous like when disliking a squeak', async () => {
      // assert sentiment: 1 dislikes, 0 likes
      expect(await contract.getDislikeCount(tokenId)).to.equal(0);
      expect(await contract.getLikeCount(tokenId)).to.equal(1);

      // she then changes her mind and dislikes the squeak instead
      await run('dislikeSqueak', {
        contract,
        signer: barbie,
        tokenId,
      });

      // assert sentiment: 0 dislikes, 1 likes
      expect(await contract.getDislikeCount(tokenId)).to.equal(1);
      expect(await contract.getLikeCount(tokenId)).to.equal(0);
    });
  });
});

// libraries
import { expect } from 'chai';
import { ethers, network, run, waffle } from 'hardhat';
import {
  twoAccounts,
  twoAccountsOneSqueak,
  twoAccountsOneDislikedSqueak,
  twoAccountsOneLikedSqueak,
} from './fixtures';
import {
  BASE_TOKEN_URI,
  BLOCK_CONFIRMATION_THRESHOLD,
  PLATFORM_FEE,
  PLATFORM_FEE_PERCENT,
} from '../constants';

// types
import { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { keccak256, defaultAbiCoder } from 'ethers/lib/utils';
import { Event } from '@ethersproject/providers/lib/base-provider';

describe('Squeaks', () => {
  let contract: Contract;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;
  let carlos: SignerWithAddress;
  let tokenId: number;

  // squeak variables
  const content = 'hello blockchain!';

  // treasury fee
  const treasuryFee = ethers.BigNumber.from(PLATFORM_FEE)
    .mul(ethers.BigNumber.from(PLATFORM_FEE_PERCENT))
    .div(ethers.BigNumber.from(100));

  // transferAmount
  const transferAmount = ethers.BigNumber.from(PLATFORM_FEE).sub(treasuryFee);

  describe('create', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie, but not Carlos',
      async () => {
        contract = await waffle.loadFixture(twoAccounts);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('creates a squeak from the senders address', async () => {
      // create squeak tx & get its info
      const tx = await contract.connect(ahmed).createSqueak(content);
      const receipt = await tx.wait();
      const event = receipt.events.find(
        (event: Event) => event.event === 'SqueakCreated'
      );
      const { tokenId } = event.args;
      const squeak = await contract.squeaks(tokenId.toNumber());
      const tokenURI = await contract.tokenURI(tokenId);
      const hexURI = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256'],
          [network.config.chainId, tokenId]
        )
      ).slice(2); // removing 0x prefix

      // assert correct event info
      await expect(tx)
        .to.emit(contract, 'SqueakCreated')
        .withArgs(ahmed.address, tokenId, tx.blockNumber, content);

      // assert correct squeak info
      expect(squeak.blockNumber).to.equal(tx.blockNumber);
      expect(squeak.author).to.equal(ahmed.address);
      expect(squeak.owner).to.equal(ahmed.address);
      expect(squeak.content).to.equal(content);

      // assert correct tokenURI
      expect(tokenURI).to.equal(BASE_TOKEN_URI + hexURI);
    });

    it('reverts when a user tries to post without an account', async () => {
      // assertions
      await expect(
        // carlos, who never created an account, trying to create a squeak
        contract.connect(carlos).createSqueak('hello blockchain!')
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts when the squeak has no content', async () => {
      // assertions
      await expect(
        contract.connect(ahmed).createSqueak('')
      ).to.be.revertedWith('Critter: squeak cannot be empty');
    });

    it('reverts when a squeak is too long', async () => {
      const longSqueak = `Did you ever hear the tragedy of Darth Plagueis The
      Wise? I thought not. It’s not a story the Jedi would tell you. It’s a Sith
      legend. Darth Plagueis was a Dark Lord of the Sith, so powerful and so
      wise he could use the Force to influence the midichlorians to create
      life...`;

      // assertions
      await expect(
        contract.connect(ahmed).createSqueak(longSqueak)
      ).to.be.revertedWith('Critter: squeak is too long');
    });
  });

  describe('delete', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets a user delete a squeak they own', async () => {
      // assert existence/ownership
      expect(await contract.balanceOf(ahmed.address)).to.equal(1);
      expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);

      // delete the squeak
      const deleteFee = await contract.getDeleteFee(
        tokenId,
        BLOCK_CONFIRMATION_THRESHOLD
      );
      const tx = await contract
        .connect(ahmed)
        .deleteSqueak(tokenId, { value: deleteFee });
      await tx.wait();

      // assert correct event info
      await expect(tx)
        .to.emit(contract, 'SqueakDeleted')
        .withArgs(ahmed.address, tokenId)
        .and.to.emit(contract, 'FeeDeposited')
        .withArgs(deleteFee);

      // assert it no longer exists
      expect(await contract.balanceOf(ahmed.address)).to.equal(0);
      await expect(contract.ownerOf(tokenId)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });

    it('deposits fees for a deleted squeak into the treasury', async () => {
      // assert the treasury is empty & ahmed has one squeak
      expect(await contract.treasury()).to.equal(0);
      expect(await contract.balanceOf(ahmed.address)).to.equal(1);

      // calculate the fee to delete the squeak
      const fee = await contract
        .connect(ahmed)
        .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

      // delete the squeak
      await run('deleteSqueak', {
        contract,
        signer: ahmed,
        tokenId,
      });

      // assert ahmed has 1 less squeak now & treasury received the fees
      expect(await contract.balanceOf(ahmed.address)).to.equal(0);
      expect(await contract.treasury()).to.equal(fee);
    });

    it('reverts when the user does not pay enough to delete the squeak', async () => {
      await expect(
        contract.connect(ahmed).deleteSqueak(tokenId, {
          value: 1, // one wei
        })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts when a user tries to delete a squeak they do not own', async () => {
      await expect(
        contract.connect(barbie).deleteSqueak(tokenId)
      ).to.be.revertedWith('Critter: not approved to delete squeak');
    });

    it('reverts when the user does have an account', async () => {
      await expect(
        contract.connect(carlos).deleteSqueak(tokenId)
      ).to.be.revertedWith('Critter: address does not have an account');
    });
  });

  describe('get', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets anybody get a delete fee for an existing token', async () => {
      // get squeak data
      const squeak = await contract.squeaks(tokenId);

      // calculate the fee expected to delete it
      const { number: latestBlockNumber } = await ethers.provider.getBlock(
        'latest'
      );
      const latestBlockThreshold =
        latestBlockNumber + BLOCK_CONFIRMATION_THRESHOLD;
      const expectedFee =
        (latestBlockThreshold - squeak.blockNumber) * PLATFORM_FEE;

      // carlos does not have a critter account, but is able calculate the
      // delete fee for ahmeds squeak from the contract
      const fee = await contract
        .connect(carlos)
        .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

      // assert expected fee matches the actual delete fee
      expect(fee).to.equal(expectedFee);
    });

    it('reverts when getting delete fees for a nonexistent token', async () => {
      await expect(
        contract.getDeleteFee(420, BLOCK_CONFIRMATION_THRESHOLD)
      ).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });

    it('lets anybody get the dislike count of a squeak', async () => {
      // assert the squeak has no dislikes
      expect(await contract.getDislikeCount(tokenId)).to.equal(0);

      // barbie dislikes it
      await run('dislikeSqueak', {
        contract,
        signer: barbie,
        tokenId,
      });

      // assert the squeak now has a like
      expect(await contract.getDislikeCount(tokenId)).to.equal(1);
    });

    it('reverts when getting the dislike count of a nonexistent squeak', async () => {
      await expect(contract.getDislikeCount(420)).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });

    it('lets anybody get the like count of a squeak', async () => {
      // assert the squeak has no likes
      expect(await contract.getLikeCount(tokenId)).to.equal(0);

      // barbie likes it
      await run('likeSqueak', {
        contract,
        signer: barbie,
        tokenId,
      });

      // assert the squeak now has a like
      expect(await contract.getLikeCount(tokenId)).to.equal(1);
    });

    it('reverts when getting the like count of a nonexistent squeak', async () => {
      await expect(contract.getLikeCount(420)).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });
  });

  describe('dislike', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets a user dislike a squeak', async () => {
      // assert squeak has no dislikes & treasury is empty
      expect(await contract.treasury()).to.equal(0);
      expect(await contract.getDislikeCount(tokenId)).to.equal(0);

      // barbie dislikes ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .dislikeSqueak(tokenId, { value: PLATFORM_FEE });
      await tx.wait();

      // assert events
      await expect(tx)
        .to.emit(contract, 'SqueakDisliked')
        .withArgs(barbie.address, tokenId)
        .and.to.emit(contract, 'FeeDeposited')
        .withArgs(PLATFORM_FEE);

      // treasury now has funds from barbie
      expect(await contract.treasury()).to.equal(PLATFORM_FEE);
      expect(await contract.getDislikeCount(tokenId)).to.equal(1);
    });

    it('reverts if a user does not have an account', async () => {
      await expect(
        contract
          .connect(carlos)
          .dislikeSqueak(tokenId, { value: PLATFORM_FEE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      await expect(
        contract.connect(barbie).dislikeSqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to dislike a nonexistent squeak ', async () => {
      await expect(
        contract.connect(barbie).dislikeSqueak(420, { value: PLATFORM_FEE })
      ).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });
  });

  describe('like', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets a user like a squeak', async () => {
      const ahmedStartingBalance = await ahmed.getBalance();

      // assert has no likes & treasury is empty
      expect(await contract.treasury()).to.equal(0);
      expect(await contract.getLikeCount(tokenId)).to.equal(0);

      // barbie likes ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .likeSqueak(tokenId, { value: PLATFORM_FEE });
      await tx.wait();

      // assert events
      await expect(tx)
        .to.emit(contract, 'SqueakLiked')
        .withArgs(barbie.address, tokenId)
        .and.to.emit(contract, 'FeeDeposited')
        .withArgs(treasuryFee)
        .and.to.emit(contract, 'FundsTransferred')
        .withArgs(ahmed.address, transferAmount);

      // assert squeak has one like
      expect(await contract.getLikeCount(tokenId)).to.equal(1);

      // assert ahmed & treasury now have funds from barbie via the platform
      expect(await contract.treasury()).to.equal(treasuryFee);
      expect(await ahmed.getBalance()).to.equal(
        ahmedStartingBalance.add(transferAmount)
      );
    });

    it('reverts if a user does not have an account', async () => {
      await expect(
        contract.connect(carlos).likeSqueak(tokenId, { value: PLATFORM_FEE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      await expect(
        contract.connect(barbie).likeSqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to like a nonexistent squeak ', async () => {
      await expect(
        contract.connect(barbie).likeSqueak(420, { value: PLATFORM_FEE })
      ).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });
  });

  describe('resqueak', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets a user resqueak a squeak', async () => {
      const ahmedStartingBalance = await ahmed.getBalance();

      // assert treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // barbie resqueaks ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .resqueak(tokenId, { value: PLATFORM_FEE });
      await tx.wait();

      // assert events
      await expect(tx)
        .to.emit(contract, 'Resqueaked')
        .withArgs(barbie.address, tokenId)
        .and.to.emit(contract, 'FeeDeposited')
        .withArgs(treasuryFee)
        .and.to.emit(contract, 'FundsTransferred')
        .withArgs(ahmed.address, transferAmount);

      // ahmed now has funds from barbie via the platform
      expect(await ahmed.getBalance()).to.equal(
        ahmedStartingBalance.add(transferAmount)
      );

      // treasury now has funds from barbie
      expect(await contract.treasury()).to.equal(treasuryFee);
    });

    it('reverts if a user does not have an account', async () => {
      await expect(
        contract.connect(carlos).resqueak(tokenId, { value: PLATFORM_FEE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      await expect(
        contract.connect(barbie).resqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to like a nonexistent squeak ', async () => {
      await expect(
        contract.connect(barbie).resqueak(420, { value: PLATFORM_FEE })
      ).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });
  });

  describe('transfer', () => {
    beforeEach(
      'Deploy contracts & create accounts for Ahmed & Barbie (but not Carlos), and Ahmed posts a squeak',
      async () => {
        [contract, tokenId] = await waffle.loadFixture(twoAccountsOneSqueak);
        [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account
      }
    );

    it('lets a user transfers squeak ownership to another user', async () => {
      let squeak = await contract.squeaks(tokenId);

      // assert ahmed owns the token
      expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
      expect(squeak.owner).to.equal(ahmed.address);

      // ahmed transfers the token to barbie (an unregistered account)
      const transferTx = await contract
        .connect(ahmed)
        .transferFrom(ahmed.address, barbie.address, tokenId);
      await transferTx.wait();
      squeak = await contract.squeaks(tokenId);

      // assert events
      expect(transferTx)
        .to.emit(contract, 'Transfer')
        .withArgs(ahmed.address, barbie.address, tokenId);

      // assert barbie now owns the token
      expect(await contract.ownerOf(tokenId)).to.equal(barbie.address);
      expect(squeak.owner).to.equal(barbie.address);
    });

    it('reverts if a signer who does not own the token tries to transfer it', async () => {
      let squeak = await contract.squeaks(tokenId);

      // assert ahmed owns the token
      expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
      expect(squeak.owner).to.equal(ahmed.address);

      // barbie (an unregistered account) attempts to transfers the token
      await expect(
        contract
          .connect(barbie)
          .transferFrom(ahmed.address, barbie.address, tokenId)
      ).to.be.revertedWith(
        'ERC721: transfer caller is not owner nor approved'
      );

      // assert ahmed still owns the token
      squeak = await contract.squeaks(tokenId);
      expect(await contract.ownerOf(tokenId)).to.equal(ahmed.address);
      expect(squeak.owner).to.equal(ahmed.address);
    });
  });

  describe('interactions', () => {
    describe('Initially disliked', () => {
      beforeEach(
        'Deploy contracts & create accounts for Ahmed & Barbie, and Ahmed posts a squeak which Barbie dislikes',
        async () => {
          [contract, tokenId] = await waffle.loadFixture(
            twoAccountsOneDislikedSqueak
          );
          [, ahmed, barbie] = await ethers.getSigners(); // ignore owner account
        }
      );

      it('does not let a user "dislike" a squeak twice', async () => {
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

    describe('Initially liked', () => {
      beforeEach(
        'Deploy contracts & create accounts for Ahmed & Barbie, and Ahmed posts a squeak which Barbie likes',
        async () => {
          [contract, tokenId] = await waffle.loadFixture(
            twoAccountsOneLikedSqueak
          );
          [, ahmed, barbie] = await ethers.getSigners(); // ignore owner account
        }
      );

      it('does not let a user "like" a squeak twice', async () => {
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
});

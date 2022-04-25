// libraries
import { expect } from 'chai';
import { ethers, network, run } from 'hardhat';
import {
  BASE_TOKEN_URI,
  BLOCK_CONFIRMATION_THRESHOLD,
  PLATFORM_CHARGE,
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

  // squeak variables
  const content = 'hello blockchain!';

  // treasury fee
  const treasuryFee = ethers.BigNumber.from(PLATFORM_CHARGE)
    .mul(ethers.BigNumber.from(PLATFORM_FEE_PERCENT))
    .div(ethers.BigNumber.from(100));

  // transferAmount
  const transferAmount = ethers.BigNumber.from(PLATFORM_CHARGE)
    .sub(treasuryFee)

  beforeEach(
    'Deploy contracts & create accounts for Ahmed & Barbie, but not Carlos',
    async () => {
      contract = await run('deployContract');
      [, ahmed, barbie, carlos] = await ethers.getSigners(); // ignore owner account

      await run('createAccount', {
        contract,
        signer: ahmed,
        username: 'ahmed',
      });

      await run('createAccount', {
        contract,
        signer: barbie,
        username: 'barbie',
      });
    }
  );

  describe('create', () => {
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
    it('lets a user delete a squeak they own', async () => {
      // create a squeak & get its tokenId
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

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
      const ahmedTokens = [];
      const gospelQuotes = [
        'Now THIS is podracing!',
        'I love democracy',
        'Impossible! Perhaps the archives are incomplete…',
        'Hello there!',
      ];

      // assert the treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // ahmed creates a few squeaks
      for (let i = 0; i < gospelQuotes.length; i++) {
        const event = await run('createSqueak', {
          contract,
          signer: ahmed,
          content: gospelQuotes[i],
        });
        ahmedTokens.push(event.args.tokenId.toNumber());
      }

      // assert ahmed owns every squeak
      expect(await contract.balanceOf(ahmed.address)).to.equal(
        ahmedTokens.length
      );

      // calculate the fee & delete the first squeak
      const firstSqueakId = ahmedTokens[0];
      const fee = await contract
        .connect(ahmed)
        .getDeleteFee(firstSqueakId, BLOCK_CONFIRMATION_THRESHOLD);

      // delete the squeak
      await run('deleteSqueak', {
        contract,
        signer: ahmed,
        tokenId: firstSqueakId,
      });

      // assert ahmed has 1 less squeak now
      expect(await contract.balanceOf(ahmed.address)).to.equal(
        ahmedTokens.length - 1
      );

      // assert the treasury received the fee to delete the first queak
      expect(await contract.treasury()).to.equal(fee);
    });

    it('reverts when the user does not pay enough to delete the squeak', async () => {
      // create squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content: 'this is the wei',
      });
      const { tokenId } = event.args;

      // delete squeak tx
      await expect(
        contract.connect(ahmed).deleteSqueak(tokenId, {
          value: 1, // one wei
        })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts when a user tries to delete a squeak they do not own', async () => {
      // ahmed creates a squeak & gets the tokenId
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId: ahmedsTokenId } = event.args;

      await expect(
        // barbie trying to delete ahmed's squeak
        contract.connect(barbie).deleteSqueak(ahmedsTokenId)
      ).to.be.revertedWith('Critter: not approved to delete squeak');
    });

    it('lets anybody get a delete fee for an existing token', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content: 'is this thing on?',
      });
      const { tokenId } = event.args;
      const squeak = await contract.squeaks(tokenId);

      // calculate the fee expected to delete it
      const { number: latestBlockNumber } = await ethers.provider.getBlock(
        'latest'
      );
      const latestBlockThreshold =
        latestBlockNumber + BLOCK_CONFIRMATION_THRESHOLD;
      const expectedFee =
        (latestBlockThreshold - squeak.blockNumber) * PLATFORM_CHARGE;

      // barbie does not have a critter account, but is able calculate the
      // delete fee for ahmeds squeak from the contract
      const fee = await contract
        .connect(barbie)
        .getDeleteFee(tokenId, BLOCK_CONFIRMATION_THRESHOLD);

      // assert expected fee matches the actual delete fee
      expect(fee).to.equal(expectedFee);
    });

    it('reverts when getting delete fees for a nonexistent token', async () => {
      const nonExistentTokenID = 420;
      await expect(
        contract.getDeleteFee(nonExistentTokenID, BLOCK_CONFIRMATION_THRESHOLD)
      ).to.be.revertedWith(
        'Critter: cannot perform action on a nonexistent token'
      );
    });
  });

  describe('dislike', () => {
    const content = 'I don’t like sand. It’s coarse and rough and irritating…';

    it('lets a user dislike a squeak', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      // assert treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // barbie dislikes ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .dislikeSqueak(tokenId, { value: PLATFORM_CHARGE });
      await tx.wait();

      // assert events
      await expect(tx)
        .to.emit(contract, 'SqueakDisliked')
        .withArgs(barbie.address, tokenId)
        .and.to.emit(contract, 'FeeDeposited')
        .withArgs(PLATFORM_CHARGE)

      // treasury now has funds from barbie
      expect(await contract.treasury()).to.equal(PLATFORM_CHARGE);
    });

    it('reverts if a user does not have an account', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(carlos).dislikeSqueak(tokenId, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(barbie).dislikeSqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to dislike a nonexistent squeak ', async () => {
      const nonExistentTokenID = 420;

      await expect(
        contract.connect(barbie).dislikeSqueak(nonExistentTokenID, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: cannot perform action on a nonexistent token');
    });
  });

  describe('like', () => {
    it('lets a user like a squeak', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;
      const ahmedStartingBalance = await ahmed.getBalance();

      // assert treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // barbie likes ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .likeSqueak(tokenId, { value: PLATFORM_CHARGE });
      await tx.wait();

      // assert events
      await expect(tx)
        .to.emit(contract, 'SqueakLiked')
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
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(carlos).likeSqueak(tokenId, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(barbie).likeSqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to like a nonexistent squeak ', async () => {
      const nonExistentTokenID = 420;

      await expect(
        contract.connect(barbie).likeSqueak(nonExistentTokenID, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: cannot perform action on a nonexistent token');
    });
  });

  describe('resqueak', () => {
    const content = 'There\'s always a bigger fish';

    it('lets a user resqueak a squeak', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;
      const ahmedStartingBalance = await ahmed.getBalance();

      // assert treasury is empty
      expect(await contract.treasury()).to.equal(0);

      // barbie likes ahmeds squeak
      const tx = await contract
        .connect(barbie)
        .resqueak(tokenId, { value: PLATFORM_CHARGE });
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
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(carlos).resqueak(tokenId, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: address does not have an account');
    });

    it('reverts if a user does not have enough funds', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;

      await expect(
        contract.connect(barbie).resqueak(tokenId, { value: 1 })
      ).to.be.revertedWith('Critter: not enough funds to perform action');
    });

    it('reverts if a user tries to like a nonexistent squeak ', async () => {
      const nonExistentTokenID = 420;

      await expect(
        contract.connect(barbie).resqueak(nonExistentTokenID, { value: PLATFORM_CHARGE })
      ).to.be.revertedWith('Critter: cannot perform action on a nonexistent token');
    });
  });

  describe('transfer', () => {
    it('lets a user transfers squeak ownership to another user', async () => {
      // ahmed creates a squeak
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;
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
      // ahmed creates a squeak & gets the tokenId
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId } = event.args;
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
});

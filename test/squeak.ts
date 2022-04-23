// libraries
import { expect } from 'chai';
import { ethers, network, run } from 'hardhat';
import { BASE_TOKEN_URI, BLOCK_CONFIRMATION_THRESHOLD } from '../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { keccak256, defaultAbiCoder } from 'ethers/lib/utils';
import { Event } from '@ethersproject/providers/lib/base-provider';

describe('Squeaks', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;
  let barbie: SignerWithAddress;

  // squeak variables
  const content = 'hello blockchain!';

  beforeEach(async () => {
    contract = await run('deployContract');
    [owner, ahmed, barbie] = await ethers.getSigners();

    await run('createAccount', {
      contract,
      signer: ahmed,
      username: 'ahmed',
    });
  });

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
      expect(squeak.content).to.equal(content);
      expect(squeak.account).to.equal(ahmed.address);

      // assert correct tokenURI
      expect(tokenURI).to.equal(BASE_TOKEN_URI + hexURI);
    });

    it('reverts when a user tries to post without an account', async () => {
      // assertions
      await expect(
        // trying to create a squeak from ahmed's account who never registered
        contract.connect(barbie).createSqueak('hello blockchain!')
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
    it('allows a user to delete their squeak', async () => {
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
        .withArgs(ahmed.address, tokenId);

      // assert it no longer exists
      expect(await contract.balanceOf(ahmed.address)).to.equal(0);
      await expect(contract.ownerOf(tokenId)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });

    it('reverts when a user tries to delete a squeak they do not own', async () => {
      // ahmed creates a squeak & gets the tokenId
      const event = await run('createSqueak', {
        contract,
        signer: ahmed,
        content,
      });
      const { tokenId: ahmedsTokenId } = event.args;

      // new user barbie
      await run('createAccount', {
        contract,
        signer: barbie,
        username: 'barbie',
      });

      await expect(
        // barbie trying to delete ahmed's squeak
        contract.connect(barbie).deleteSqueak(ahmedsTokenId)
      ).to.be.revertedWith('Critter: not approved to delete squeak');
    });
  });
});

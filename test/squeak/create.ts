import { expect } from 'chai';
import { ethers, network, waffle } from 'hardhat';
import { keccak256, defaultAbiCoder } from 'ethers/lib/utils';
import { twoAccounts } from '../fixtures';
import { BASE_TOKEN_URI } from '../../constants';

// types
import type { Contract } from 'ethers';
import type { Event } from '@ethersproject/providers/lib/base-provider';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Create squeak', () => {
  let contract: Contract;
  let ahmed: SignerWithAddress;
  let carlos: SignerWithAddress;

  // squeak variables
  const content = 'hello there!';

  beforeEach(
    ` Deploy contracts.
        Create accounts for Ahmed & Barbie, but not Carlos.`,
    async () => {
      contract = await waffle.loadFixture(twoAccounts);
      [, ahmed, , carlos] = await ethers.getSigners();
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
    ).to.be.reverted;
  });

  it('reverts when the squeak has no content', async () => {
    // assertions
    await expect(contract.connect(ahmed).createSqueak('')).to.be.revertedWith(
      'Critter: squeak cannot be empty'
    );
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

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { ContractTransaction } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('setApprovalForAll', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    tx: ContractTransaction;

  const setApprovalForAllFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // everybody creates an account
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a few squeaks
    [
      'Now THIS is podracing!',
      'I hate sand 😤',
      'Hello there!',
      'A surpise to be sure, but a welcome one.',
    ].forEach(async (content) => await critter.createSqueak(content));

    // ahmed approves barbie as an operator on his behalf
    tx = await critter.setApprovalForAll(barbie.address, true);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(setApprovalForAllFixture));
  });

  it('returns true if an operator is approved to manage all of the owners squeaks', async () => {
    expect(await critter.isApprovedForAll(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('emits an ApprovalForAll event', async () => {
    await expect(tx)
      .to.emit(critter, 'ApprovalForAll')
      .withArgs(ahmed.address, barbie.address, true);
  });

  it('reverts if the owner and operator are the same address', async () => {
    await expect(
      critter.setApprovalForAll(ahmed.address, true)
    ).to.be.revertedWithCustomError(critter, 'ApproveToCaller');
  });
});

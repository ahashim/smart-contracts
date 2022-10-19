import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('isApprovedForAll', () => {
  let ahmed: SignerWithAddress, barbie: SignerWithAddress, critter: Critter;

  const isApprovedForAllFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    await critter.createSqueak('hello blockchain!');

    // ahmed approves barbie to manage all his squeaks
    await critter.setApprovalForAll(barbie.address, true);

    return critter;
  };

  beforeEach(
    'load deployed contract fixture, barbie & ahmed create an accounts, and ahmed posts a squeak',
    async () => {
      critter = await loadFixture(isApprovedForAllFixture);
    }
  );

  it('returns true if a user is approved to manage all assets of an owner', async () => {
    expect(await critter.isApprovedForAll(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('returns false if a user is not approved to manage all assets of an owner', async () => {
    expect(await critter.isApprovedForAll(barbie.address, ahmed.address)).to.be
      .false;
  });
});

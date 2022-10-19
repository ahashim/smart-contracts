import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Relation } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('isFollowing', () => {
  let ahmed: SignerWithAddress, barbie: SignerWithAddress, critter: Critter;

  const isFollowingFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed follows barbie
    await critter.updateRelationship(barbie.address, Relation.Follow);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(isFollowingFixture);
  });

  it('returns true if user one is following user two', async () => {
    expect(await critter.isFollowing(ahmed.address, barbie.address)).to.be
      .true;
  });

  it('returns false if user one is not following user two', async () => {
    expect(await critter.isFollowing(barbie.address, ahmed.address)).to.be
      .false;
  });
});

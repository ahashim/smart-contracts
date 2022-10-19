import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Relation } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('isBlocked', () => {
  let ahmed: SignerWithAddress, barbie: SignerWithAddress, critter: Critter;

  const isBlockedFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed blocks barbie
    await critter.updateRelationship(barbie.address, Relation.Block);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(isBlockedFixture);
  });

  it('returns true if user one has blocked user two', async () => {
    expect(await critter.isBlocked(ahmed.address, barbie.address)).to.be.true;
  });

  it('returns false if user one has not blocked user two', async () => {
    expect(await critter.isBlocked(barbie.address, ahmed.address)).to.be.false;
  });
});

import { Relation } from '../enums';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('isBlocked', () => {
  let ahmed: SignerWithAddress, barbie: SignerWithAddress, critter: Critter;

  const isBlockedFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    critter = (await run('deploy-critter-contract')).critter.connect(ahmed);

    // creates accounts
    await run('create-accounts', {
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

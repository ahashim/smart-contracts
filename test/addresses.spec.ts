import { ethers, expect, loadFixture, run } from './setup';
import type { Critter, SignerWithAddress } from '../types';

describe('addresses', () => {
  const username = 'ahmed';
  let ahmed: SignerWithAddress, critter: Critter;

  const addressesFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount(username);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(addressesFixture);
  });

  it('returns the address of an account', async () => {
    expect(await critter.addresses(username)).to.eq(ahmed.address);
  });

  it('returns the zero address for an unknown account', async () => {
    expect(await critter.addresses('R2-D2')).to.eq(
      ethers.constants.AddressZero
    );
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('addresses', () => {
  const username = 'ahmed';
  let ahmed: SignerWithAddress, critter: Critter;

  const addressesFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

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
      hardhat.ethers.constants.AddressZero
    );
  });
});

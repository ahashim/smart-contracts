import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { OPERATOR_ROLE } from '../constants';
import { Configuration } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe('updateConfiguration', () => {
  const newMaxLevel = 100;

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress;

  const updateConfigurationFixture = async () => {
    [owner, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // the owner grants ahmed the ADMIN_ROLE
    await critter
      .connect(owner)
      .grantRole(hardhat.ethers.utils.id(OPERATOR_ROLE), ahmed.address);

    // ahmed increases the max level for scouts (note: A Critter account is not
    // required to update configuration)
    await critter.updateConfiguration(
      Configuration.ScoutMaxLevel,
      newMaxLevel
    );

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(updateConfigurationFixture);
  });

  it('updates a contract configuration value', async () => {
    expect(await critter.config(Configuration.ScoutMaxLevel)).to.eq(
      newMaxLevel
    );
  });

  it('reverts when someone other than the operator tries to update a contract configuration value', async () => {
    await expect(
      critter
        .connect(barbie)
        .updateConfiguration(Configuration.ScoutMaxLevel, 69)
    ).to.be.revertedWith(
      `AccessControl: account ${barbie.address.toLowerCase()} is missing role ${hardhat.ethers.utils.id(
        OPERATOR_ROLE
      )}`
    );
  });
});

import { OPERATOR_ROLE } from '../constants';
import { Configuration } from '../enums';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('updateConfiguration', () => {
  const newMaxLevel = 100;

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress;

  const updateConfigurationFixture = async () => {
    [owner, ahmed, barbie] = await ethers.getSigners();
    critter = (await run('initialize-contracts')).critter.connect(ahmed);

    // the owner grants ahmed the ADMIN_ROLE
    await critter.connect(owner).grantRole(OPERATOR_ROLE, ahmed.address);

    // ahmed increases the max level for users (note: A Critter account is not
    // required to update configuration)
    await critter.updateConfiguration(Configuration.MaxLevel, newMaxLevel);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(updateConfigurationFixture);
  });

  it('updates a contract configuration value', async () => {
    expect(await critter.config(Configuration.MaxLevel)).to.eq(newMaxLevel);
  });

  it('reverts when someone other than the operator tries to update a contract configuration value', async () => {
    await expect(
      critter.connect(barbie).updateConfiguration(Configuration.MaxLevel, 69)
    ).to.be.revertedWith(
      `AccessControl: account ${barbie.address.toLowerCase()} is missing role ${OPERATOR_ROLE}`
    );
  });
});

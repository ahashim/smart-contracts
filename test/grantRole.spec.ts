import { TREASURER_ROLE } from '../constants';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('grantRole', () => {
  const ID_TREASURER_ROLE = ethers.utils.id(TREASURER_ROLE);
  let ahmed: SignerWithAddress, critter: Critter;

  const grantRoleFixture = async () => {
    [, ahmed] = await ethers.getSigners();
    critter = (await run('deploy-critter-contract')).critter;

    // granting ahmed the treasurer role
    await critter.grantRole(ID_TREASURER_ROLE, ahmed.address);

    return critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(grantRoleFixture);
  });

  it('lets the role admin grant a role to an address', async () => {
    expect(await critter.hasRole(ID_TREASURER_ROLE, ahmed.address)).to.be.true;
  });
});

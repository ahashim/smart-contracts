import {
  MODERATOR_ROLE,
  OPERATOR_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('hasRole', () => {
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  let critter: Critter, owner: SignerWithAddress;

  const hasRoleFixture = async () => {
    [owner] = await ethers.getSigners();
    critter = (await run('deploy-contracts')).critter;

    return {
      critter,
      owner,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, owner } = await loadFixture(hasRoleFixture));
  });

  it('grants the contract owner the DEFAULT_ADMIN_ROLE', async () => {
    expect(await critter.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be
      .true;
  });

  it('grants the contract owner the OPERATOR_ROLE', async () => {
    expect(await critter.hasRole(OPERATOR_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the MODERATOR_ROLE', async () => {
    expect(await critter.hasRole(MODERATOR_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the TREASURER_ROLE', async () => {
    expect(await critter.hasRole(TREASURER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the UPGRADER_ROLE', async () => {
    expect(await critter.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
  });
});

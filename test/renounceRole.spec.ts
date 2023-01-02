import { OPERATOR_ROLE, UPGRADER_ROLE } from '../constants';
import type {
  ContractTransaction,
  Critter,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('renounceRole', () => {
  let ahmed: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const renounceRoleFixture = async () => {
    [owner, ahmed] = await ethers.getSigners();
    const critter = (await run('deploy-critter-contract')).critter;

    // owner renounces the operator role
    tx = await critter.renounceRole(OPERATOR_ROLE, owner.address);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture, ', async () => {
    ({ critter, tx } = await loadFixture(renounceRoleFixture));
  });

  it('lets a user to renounce any roles they might have', async () => {
    expect(await critter.hasRole(OPERATOR_ROLE, owner.address)).to.be.false;
  });

  it('emits a RoleRevoked event', async () => {
    await expect(tx)
      .to.emit(critter, 'RoleRevoked')
      .withArgs(OPERATOR_ROLE, owner.address, owner.address);
  });

  it('reverts when trying to renounce another addresses role', async () => {
    await expect(
      critter.renounceRole(UPGRADER_ROLE, ahmed.address)
    ).to.be.revertedWith('AccessControl: can only renounce roles for self');
  });
});

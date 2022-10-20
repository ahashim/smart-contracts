import { ethers, expect, loadFixture, run } from './setup';
import { MINTER_ROLE, UPGRADER_ROLE } from '../constants';
import type {
  ContractTransaction,
  Critter,
  SignerWithAddress,
} from '../types';

describe('renounceRole', () => {
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_UPGRADER_ROLE = ethers.utils.id(UPGRADER_ROLE);

  let ahmed: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    tx: ContractTransaction;

  const renounceRoleFixture = async () => {
    [owner, ahmed] = await ethers.getSigners();
    const critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed renounces the minter role
    tx = await critter.renounceRole(ID_MINTER_ROLE, ahmed.address);

    return { critter, tx };
  };

  beforeEach(
    'load deployed contract fixture, and ahmed creates an account that gives him MINTER_ROLE access',
    async () => {
      ({ critter, tx } = await loadFixture(renounceRoleFixture));
    }
  );

  it('lets a user to renounce any roles they might have', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, ahmed.address)).to.be.false;
  });

  it('emits a RoleRevoked event', async () => {
    await expect(tx)
      .to.emit(critter, 'RoleRevoked')
      .withArgs(ID_MINTER_ROLE, ahmed.address, ahmed.address);
  });

  it('reverts when trying to renounce another addresses role', async () => {
    await expect(
      critter.renounceRole(ID_UPGRADER_ROLE, owner.address)
    ).to.be.revertedWith('AccessControl: can only renounce roles for self');
  });
});

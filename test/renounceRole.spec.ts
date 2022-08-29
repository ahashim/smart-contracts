import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { MINTER_ROLE, PAUSER_ROLE } from '../constants';

// types
import { ContractTransaction, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('renounceRole', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let tx: ContractTransaction;

  // test variables
  const ID_MINTER_ROLE = ethers.utils.id(MINTER_ROLE);
  const ID_PAUSER_ROLE = ethers.utils.id(PAUSER_ROLE);

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const renounceRoleFixture = async () => {
    // deploy contract
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

  it('reverts when trying to renounce another users role', async () => {
    await expect(critter.renounceRole(ID_PAUSER_ROLE, owner.address)).to.be
      .reverted;
  });
});

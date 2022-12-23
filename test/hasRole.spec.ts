import {
  MINTER_ROLE,
  MODERATOR_ROLE,
  OPERATOR_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';
import type { Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('hasRole', () => {
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    daphne: SignerWithAddress,
    evan: SignerWithAddress,
    owner: SignerWithAddress,
    users: {
      [key: string]: boolean;
    };

  const hasRoleFixture = async () => {
    [owner, ahmed, barbie, carlos, daphne, evan] = await ethers.getSigners();
    critter = (await run('deploy-contracts')).critter.connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne, evan],
      contract: critter,
    });

    return {
      critter,
      users: {
        ahmed: await critter.hasRole(MINTER_ROLE, ahmed.address),
        barbie: await critter.hasRole(MINTER_ROLE, barbie.address),
        carlos: await critter.hasRole(MINTER_ROLE, carlos.address),
        daphne: await critter.hasRole(MINTER_ROLE, daphne.address),
        evan: await critter.hasRole(MINTER_ROLE, evan.address),
      },
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, users } = await loadFixture(hasRoleFixture));
  });

  it('grants the contract owner the DEFAULT_ADMIN_ROLE', async () => {
    expect(await critter.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be
      .true;
  });

  it('grants the contract owner the MINTER_ROLE', async () => {
    expect(await critter.hasRole(MINTER_ROLE, owner.address)).to.be.true;
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

  it('grants every new user the MINTER_ROLE', () => {
    for (const minter in users) {
      expect(users[minter]).to.be.true;
    }
  });
});

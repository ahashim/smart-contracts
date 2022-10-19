import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import {
  MINTER_ROLE,
  MODERATOR_ROLE,
  OPERATOR_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';

describe.only('hasRole', () => {
  const ID_DEFAULT_ADMIN_ROLE = hardhat.ethers.constants.HashZero;
  const ID_MINTER_ROLE = hardhat.ethers.utils.id(MINTER_ROLE);
  const ID_MODERATOR_ROLE = hardhat.ethers.utils.id(MODERATOR_ROLE);
  const ID_OPERATOR_ROLE = hardhat.ethers.utils.id(OPERATOR_ROLE);
  const ID_TREASURER_ROLE = hardhat.ethers.utils.id(TREASURER_ROLE);
  const ID_UPGRADER_ROLE = hardhat.ethers.utils.id(UPGRADER_ROLE);

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
    [owner, ahmed, barbie, carlos, daphne, evan] =
      await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne, evan],
      contract: critter,
    });

    return {
      critter,
      users: {
        ahmed: await critter.hasRole(ID_MINTER_ROLE, ahmed.address),
        barbie: await critter.hasRole(ID_MINTER_ROLE, barbie.address),
        carlos: await critter.hasRole(ID_MINTER_ROLE, carlos.address),
        daphne: await critter.hasRole(ID_MINTER_ROLE, daphne.address),
        evan: await critter.hasRole(ID_MINTER_ROLE, evan.address),
      },
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, users } = await loadFixture(hasRoleFixture));
  });

  it('grants the contract owner the DEFAULT_ADMIN_ROLE', async () => {
    expect(await critter.hasRole(ID_DEFAULT_ADMIN_ROLE, owner.address)).to.be
      .true;
  });

  it('grants the contract owner the MINTER_ROLE', async () => {
    expect(await critter.hasRole(ID_MINTER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the OPERATOR_ROLE', async () => {
    expect(await critter.hasRole(ID_OPERATOR_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the MODERATOR_ROLE', async () => {
    expect(await critter.hasRole(ID_MODERATOR_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the TREASURER_ROLE', async () => {
    expect(await critter.hasRole(ID_TREASURER_ROLE, owner.address)).to.be.true;
  });

  it('grants the contract owner the UPGRADER_ROLE', async () => {
    expect(await critter.hasRole(ID_UPGRADER_ROLE, owner.address)).to.be.true;
  });

  it('grants every new user the MINTER_ROLE', async () => {
    for (const minter in users) {
      expect(users[minter]).to.be.true;
    }
  });
});

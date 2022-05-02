// libraries
import { expect } from 'chai';
import { ethers, run } from 'hardhat';
import {
  MINTER_ROLE,
  PAUSER_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Contract state', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  // role ID's
  const minterRole: string = ethers.utils.id(MINTER_ROLE);
  const pauserRole: string = ethers.utils.id(PAUSER_ROLE);
  const treasurerRole: string = ethers.utils.id(TREASURER_ROLE);
  const upgraderRole: string = ethers.utils.id(UPGRADER_ROLE);

  beforeEach('Deploy contracts.', async () => {
    contract = await run('deployContract');
    [owner, ahmed] = await ethers.getSigners();
  });

  it('grants the contract owner all available roles after deployment', async () => {
    [minterRole, pauserRole, treasurerRole, upgraderRole].forEach(
      async (role) => {
        // assert owner has all roles associated with their account
        expect(await contract.hasRole(role, owner.address)).to.eq(true);
      }
    );
  });

  it('can be paused & unpaused by PAUSER_ROLE', async () => {
    // pause the contract from owner account & assert the event
    expect(await contract.connect(owner).pause())
      .to.emit(contract, 'Paused')
      .withArgs(owner.address);
    expect(await contract.paused()).to.equal(true);

    // unpause the contract from the same account & assert the event
    expect(await contract.connect(owner).unpause())
      .to.emit(contract, 'Unpaused')
      .withArgs(owner.address);
    expect(await contract.paused()).to.equal(false);
  });

  it('reverts when a user without a PAUSER_ROLE tries to pause/unpause', async () => {
    await expect(
      // ahmed trying to delete contract owners squeak
      contract.connect(ahmed).pause()
    ).to.be.revertedWith(
      'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a'
    );
  });
});

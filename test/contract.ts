// libraries
import { expect } from 'chai';
import { ethers, run } from 'hardhat';
import {
  MINTER_ROLE,
  PAUSER_ROLE,
  TREASURER_ROLE,
  UPGRADER_ROLE,
} from '../constants';

// types
import type { Contract } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Contract', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  // role ID's
  const minterRole: string = ethers.utils.id(MINTER_ROLE);
  const pauserRole: string = ethers.utils.id(PAUSER_ROLE);
  const treasurerRole: string = ethers.utils.id(TREASURER_ROLE);
  const upgraderRole: string = ethers.utils.id(UPGRADER_ROLE);

  beforeEach(async () => {
    contract = await run('deployContract');
    [owner, ahmed] = await ethers.getSigners();
  });

  describe('interfaces', () => {
    it('supports the ERCI65 interface', async () => {
      expect(await contract.supportsInterface('0x01ffc9a7')).to.equal(true);
    });

    it('supports the ERC721 interface', async () => {
      expect(await contract.supportsInterface('0x80ac58cd')).to.equal(true);
    });

    it('supports the ERC721Metadata interface', async () => {
      expect(await contract.supportsInterface('0x5b5e139f')).to.equal(true);
    });

    it('supports the ERC721Enumerable interface', async () => {
      expect(await contract.supportsInterface('0x780e9d63')).to.equal(true);
    });
  });

  describe('state', () => {
    it('grants the contract owner all available roles after deployment', async () => {
      [minterRole, pauserRole, treasurerRole, upgraderRole].forEach(
        async (role) => {
          // assert owner has all roles associated with their account
          expect(await contract.getRoleMemberCount(role)).to.equal(1);
          expect(await contract.getRoleMember(role, 0)).to.equal(
            owner.address
          );
        }
      );
    });

    it('can be paused & unpaused by PAUSER_ROLE', async () => {
      // pause the contract from owner account
      expect(await contract.connect(owner).pause())
        .to.emit(contract, 'Paused')
        .withArgs(owner.address);
      expect(await contract.paused()).to.equal(true);

      // unpause the contract from the same account
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

  describe('upgradeable', () => {
    it('reverts when a user without an UPGRADER_ROLE tries to upgrade', async () => {
      // upgrade variables
      const upgradeAddress = ethers.utils.getAddress(
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
      );
      await expect(
        // ahmed trying to upgrade the contract w/o an UPGRADER_ROLE
        contract.connect(ahmed).upgradeTo(upgradeAddress)
      ).to.be.revertedWith(
        'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'
      );
    });
  });
});

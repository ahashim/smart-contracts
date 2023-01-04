/* eslint-disable camelcase */
import { UPGRADER_ROLE } from '../constants';
import type {
  ContractTransaction,
  Critter,
  CritterContracts,
  LibraryContracts,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('linkContracts', () => {
  let ahmed: SignerWithAddress, critter: Critter, tx: ContractTransaction;

  const linkContractsFixture = async () => {
    [, ahmed] = await ethers.getSigners();

    // deploy libraries
    const { libAccountable, libBankable, libViral }: LibraryContracts =
      await run('deploy-libraries');

    // deploy critter
    const { critter }: CritterContracts = await run(
      'deploy-critter-contract',
      {
        libraries: {
          libAccountable,
          libBankable,
          libViral,
        },
      }
    );

    // deploy squeakable
    const squeakable: Squeakable = await run('deploy-squeakable-contract', {
      critterAddress: critter.address,
    });

    // link contracts
    tx = await critter.linkContracts(squeakable.address);

    return { critter, tx };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, tx } = await loadFixture(linkContractsFixture));
  });

  it('emits a LinkedContract event', async () => {
    await expect(tx).to.emit(critter, 'LinkedContracts');
  });

  it('reverts when someone other than the UPPGRADER_ROLE tries to link contracts', async () => {
    await expect(
      critter.connect(ahmed).linkContracts(ahmed.address)
    ).to.be.revertedWith(
      `AccessControl: account ${ahmed.address.toLowerCase()} is missing role ${UPGRADER_ROLE.toLowerCase()}`
    );
  });
});

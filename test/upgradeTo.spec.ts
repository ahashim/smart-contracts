import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';
import type { Contract, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run, upgrades } from './setup';

describe('upgradeTo', () => {
  let ahmed: SignerWithAddress, critter: Critter, upgradedContract: Contract;

  const upgradeToFixture = async () => {
    [, ahmed] = await ethers.getSigners();

    // deploy librar
    const { libUsernameRegex, libViralityScore } = await run(
      'deploy-libraries'
    );

    // deploy contract
    const contractFactory = await ethers.getContractFactory(CONTRACT_NAME, {
      libraries: {
        UsernameRegex: libUsernameRegex.address,
        ViralityScore: libViralityScore.address,
      },
    });
    critter = (await upgrades.deployProxy(
      contractFactory,
      CONTRACT_INITIALIZER,
      {
        unsafeAllow: ['external-library-linking'],
      }
    )) as Critter;

    // owner upgrades the contract
    upgradedContract = await upgrades.upgradeProxy(
      critter.address,
      contractFactory,
      {
        unsafeAllow: ['external-library-linking'],
      }
    );

    return { critter, upgradedContract };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, upgradedContract } = await loadFixture(upgradeToFixture));
  });

  it('upgrades the contract', () => {
    expect(upgradedContract.address).to.equal(critter.address);
  });

  it('reverts when upgrading to an account that does not support UUPS', async () => {
    await expect(critter.upgradeTo(critter.address)).to.be.revertedWith(
      'ERC1967Upgrade: new implementation is not UUPS'
    );
  });

  it('reverts when upgrading to a non-contract account', async () => {
    await expect(critter.upgradeTo(ahmed.address)).to.be.reverted;
  });
});

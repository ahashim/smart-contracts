import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type { Critter } from '../typechain-types/contracts';
import type { Wallet } from 'ethers';

describe('supportsInterface', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet;

  before('create fixture loader', async () => {
    [owner] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner]);
  });

  const supportsInterfaceFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    return (await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    )) as Critter;
  };

  beforeEach('load deployed contract fixture', async () => {
    critter = await loadFixture(supportsInterfaceFixture);
  });

  // tests variables
  const interfaceIds = {
    ERC165: '0x01ffc9a7',
    ERC721: '0x80ac58cd',
    ERC721Metadata: '0x5b5e139f',
    Other: '0xa2b4c6d8',
  };

  it('supports the ERCI65 interface', async () => {
    expect(await critter.supportsInterface(interfaceIds.ERC165)).to.be.true;
  });

  it('supports the ERC721 interface', async () => {
    expect(await critter.supportsInterface(interfaceIds.ERC165)).to.be.true;
  });

  it('supports the ERC721Metadata interface', async () => {
    expect(await critter.supportsInterface(interfaceIds.ERC721Metadata)).to.be
      .true;
  });

  it('does not support other interface IDs', async () => {
    expect(await critter.supportsInterface(interfaceIds.Other)).to.be.false;
  });
});

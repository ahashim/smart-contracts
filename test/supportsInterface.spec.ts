import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { Critter } from '../typechain-types/contracts';

describe('supportsInterface', () => {
  let critter: Critter;
  let supportedInterfaces: {
    [key: string]: boolean;
  };

  const supportsInterfaceFixture = async () => {
    critter = await hardhat.run('deploy-contract');

    return {
      critter,
      supportedInterfaces: {
        ERC165: await critter.supportsInterface('0x01ffc9a7'),
        ERC721: await critter.supportsInterface('0x80ac58cd'),
        ERC721Metadata: await critter.supportsInterface('0x5b5e139f'),
        Other: await critter.supportsInterface('0xdeadbea7'),
      },
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, supportedInterfaces } = await loadFixture(
      supportsInterfaceFixture
    ));
  });

  it('supports the ERCI65 interface', () => {
    expect(supportedInterfaces.ERC165).to.be.true;
  });

  it('supports the ERC721 interface', () => {
    expect(supportedInterfaces.ERC721).to.be.true;
  });

  it('supports the ERC721Metadata interface', () => {
    expect(supportedInterfaces.ERC721Metadata).to.be.true;
  });

  it('does not support other interface IDs', () => {
    expect(supportedInterfaces.Other).to.be.false;
  });
});

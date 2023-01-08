import type { Critter, Squeakable } from '../types';
import { expect, loadFixture, run } from './setup';

describe('supportsInterface', () => {
  let critter: Critter,
    squeakable: Squeakable,
    supportedInterfaces: {
      [key: string]: boolean;
    };

  const supportsInterfaceFixture = async () => {
    ({ critter, squeakable } = await run('initialize-contracts'));

    return {
      critter,
      supportedInterfaces: {
        ERC165: await critter.supportsInterface('0x01ffc9a7'),
        ERC721: await squeakable.supportsInterface('0x80ac58cd'),
        ERC721Metadata: await squeakable.supportsInterface('0x5b5e139f'),
        Other: await critter.supportsInterface('0xd34db347'),
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

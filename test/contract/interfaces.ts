// libraries
import { expect } from 'chai';
import { run } from 'hardhat';

// types
import type { Contract } from 'ethers';

describe('Contract interfaces', () => {
  let contract: Contract;

  beforeEach('Deploy contracts.', async () => {
    contract = await run('deployContract');
  });

  it('supports the ERCI65 interface', async () => {
    expect(await contract.supportsInterface('0x01ffc9a7')).to.equal(true);
  });

  it('supports the ERC721 interface', async () => {
    expect(await contract.supportsInterface('0x80ac58cd')).to.equal(true);
  });

  it('supports the ERC721Metadata interface', async () => {
    expect(await contract.supportsInterface('0x5b5e139f')).to.equal(true);
  });
});

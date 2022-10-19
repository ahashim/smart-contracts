import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('ownerOf', () => {
  let critter: Critter, ahmed: SignerWithAddress, squeakId: BigNumber;

  const ownerOfFixture = async () => {
    [, ahmed] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(ownerOfFixture));
    }
  );

  it('gets the owner address of a squeak', async () => {
    expect(await critter.ownerOf(squeakId)).to.equal(ahmed.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.ownerOf(420)).to.be.reverted;
  });
});

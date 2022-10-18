import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import hardhat from 'hardhat';
import { expect } from 'chai';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';
import type { BigNumber } from 'ethers';

describe('getApproved', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakId: BigNumber;

  const approveFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed & barbie create an accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed approves barbie for it
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(approveFixture));
  });

  it('returns the account approved to manage a squeak', async () => {
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.getApproved(420)).to.be.revertedWithCustomError(
      critter,
      'ApprovalQueryForNonexistentToken'
    );
  });
});

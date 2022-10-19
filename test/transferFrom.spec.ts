import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('transferFrom', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    squeakId: BigNumber;

  const transferFromFixture = async () => {
    [owner, ahmed, barbie] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // everybody creates an account
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed approve barbie to transfer it
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak then approves barbie to transfer it',
    async () => {
      ({ critter, squeakId } = await loadFixture(transferFromFixture));
    }
  );

  it('lets an owner transfer a token to another user', async () => {
    await critter.transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await critter.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('lets an approved user transfer a token to another user', async () => {
    await critter
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await critter.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('reassigns squeak ownership once the token has been transferred', async () => {
    await critter.transferFrom(ahmed.address, barbie.address, squeakId);

    expect((await critter.squeaks(squeakId)).owner).to.eq(barbie.address);
  });

  it('reverts if transferring from a zero address', async () => {
    await expect(
      critter.transferFrom(
        hardhat.ethers.constants.AddressZero,
        barbie.address,
        squeakId
      )
    ).to.be.revertedWithCustomError(critter, 'TransferFromIncorrectOwner');
  });

  it('reverts if transferring to a zero address', async () => {
    await expect(
      critter.transferFrom(
        ahmed.address,
        hardhat.ethers.constants.AddressZero,
        squeakId
      )
    ).to.be.revertedWithCustomError(critter, 'TransferToZeroAddress');
  });

  it('reverts if the squeak is not owned by the "from" address', async () => {
    await expect(
      critter.transferFrom(owner.address, barbie.address, squeakId)
    ).to.be.revertedWithCustomError(critter, 'TransferFromIncorrectOwner');
  });

  it('reverts if the caller is not approved or an owner of the squeak being transferred', async () => {
    await expect(
      critter
        .connect(owner)
        .transferFrom(ahmed.address, barbie.address, squeakId)
    ).to.be.revertedWithCustomError(
      critter,
      'TransferCallerNotOwnerNorApproved'
    );
  });
});

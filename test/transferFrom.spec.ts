import type {
  BigNumber,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('transferFrom', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    squeakable: Squeakable,
    squeakId: BigNumber;

  const transferFromFixture = async () => {
    [owner, ahmed, barbie] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // everybody creates an account
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed approve barbie to transfer it
    await squeakable.connect(ahmed).approve(barbie.address, squeakId);

    return { squeakable, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ squeakable, squeakId } = await loadFixture(transferFromFixture));
  });

  it('lets an owner transfer a token to another user', async () => {
    await squeakable
      .connect(ahmed)
      .transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await squeakable.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('lets an approved user transfer a token to another user', async () => {
    await squeakable
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);
    expect(await squeakable.ownerOf(squeakId)).to.eq(barbie.address);
  });

  it('reverts if transferring from a zero address', async () => {
    await expect(
      squeakable
        .connect(ahmed)
        .transferFrom(ethers.constants.AddressZero, barbie.address, squeakId)
    ).to.be.revertedWithCustomError(squeakable, 'TransferFromIncorrectOwner');
  });

  it('reverts if transferring to a zero address', async () => {
    await expect(
      squeakable
        .connect(ahmed)
        .transferFrom(ahmed.address, ethers.constants.AddressZero, squeakId)
    ).to.be.revertedWithCustomError(squeakable, 'TransferToZeroAddress');
  });

  it('reverts if the squeak is not owned by the "from" address', async () => {
    await expect(
      squeakable
        .connect(ahmed)
        .transferFrom(owner.address, barbie.address, squeakId)
    ).to.be.revertedWithCustomError(squeakable, 'TransferFromIncorrectOwner');
  });

  it('reverts if the caller is not approved or an owner of the squeak being transferred', async () => {
    await expect(
      squeakable
        .connect(owner)
        .transferFrom(ahmed.address, barbie.address, squeakId)
    ).to.be.revertedWithCustomError(
      squeakable,
      'TransferCallerNotOwnerNorApproved'
    );
  });
});

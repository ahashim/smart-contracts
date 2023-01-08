import type {
  BigNumber,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('approve', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable,
    squeakId: BigNumber;

  const approveFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed & barbie create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed creates a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed approves barbie to transfer the squeak
    await squeakable.connect(ahmed).approve(barbie.address, squeakId);

    return { squeakable, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ squeakable, squeakId } = await loadFixture(approveFixture));
  });

  it('lets a user approve another account to manage a squeak', async () => {
    expect(await squeakable.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('sets the approver back to the zero address after transferring a squeak', async () => {
    await squeakable
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);

    expect(await squeakable.getApproved(squeakId)).to.eq(
      ethers.constants.AddressZero
    );
  });

  it('reverts if someone other than the squeak owner tries to approve it', async () => {
    await expect(
      squeakable.connect(carlos).approve(ahmed.address, squeakId)
    ).to.be.revertedWithCustomError(
      squeakable,
      'ApprovalCallerNotOwnerNorApproved'
    );
  });
});

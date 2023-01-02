import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('approve', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    squeakId: BigNumber;

  const approveFixture = async () => {
    [, ahmed, barbie, carlos] = await ethers.getSigners();
    critter = (await run('deploy-critter-contract')).critter.connect(ahmed);

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
    await critter.approve(barbie.address, squeakId);

    return { critter, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, squeakId } = await loadFixture(approveFixture));
  });

  it('lets a user approve another account to manage a squeak', async () => {
    expect(await critter.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('sets the approver back to the zero address after transferring a squeak', async () => {
    await critter
      .connect(barbie)
      .transferFrom(ahmed.address, barbie.address, squeakId);

    expect(await critter.getApproved(squeakId)).to.eq(
      ethers.constants.AddressZero
    );
  });

  it('reverts if someone other than the squeak owner tries to approve it', async () => {
    await expect(
      critter.connect(carlos).approve(ahmed.address, squeakId)
    ).to.be.revertedWithCustomError(
      critter,
      'ApprovalCallerNotOwnerNorApproved'
    );
  });
});

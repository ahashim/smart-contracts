import type {
  BigNumber,
  Critter,
  SignerWithAddress,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('getApproved', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakable: Squeakable,
    squeakId: BigNumber;

  const approveFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed & barbie create an accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed approves barbie for it
    await squeakable.connect(ahmed).approve(barbie.address, squeakId);

    return { squeakable, squeakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ squeakable, squeakId } = await loadFixture(approveFixture));
  });

  it('returns the account approved to manage a squeak', async () => {
    expect(await squeakable.getApproved(squeakId)).to.eq(barbie.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(squeakable.getApproved(420)).to.be.revertedWithCustomError(
      squeakable,
      'ApprovalQueryForNonexistentToken'
    );
  });
});

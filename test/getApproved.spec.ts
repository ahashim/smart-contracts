import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('getApproved', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    squeakId: BigNumber;

  const approveFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    critter = (await run('initialize-contracts')).contracts.critter.connect(
      ahmed
    );

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

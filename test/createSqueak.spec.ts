import { MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Critter,
  SignerWithAddress,
  Squeak,
  Squeakable,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('createSqueak', () => {
  const content = 'hello blockchain!';
  const rawContent = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(content));
  let accountBalance: BigNumber,
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    owner: SignerWithAddress,
    receipt: ContractReceipt,
    squeak: Squeak,
    squeakable: Squeakable,
    squeakId: BigNumber,
    tx: ContractTransaction;

  const createSqueakFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
    ({ critter, squeakable } = await run('initialize-contracts'));

    // ahmed, barbie, and daphne create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // contract owner grants ahmed the moderator role
    await critter.connect(owner).grantRole(MODERATOR_ROLE, ahmed.address);

    // ahmed creates a squeak
    ({ receipt, squeakId, tx } = await run('create-squeak', {
      content,
      contract: critter,
      signer: ahmed,
    }));

    // ahmed bans barbie
    critter = critter.connect(ahmed);
    await critter.updateStatus(barbie.address, Status.Banned);

    return {
      accountBalance: await squeakable.balanceOf(ahmed.address),
      critter,
      receipt,
      squeak: await squeakable.squeaks(squeakId),
      squeakable,
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ accountBalance, critter, receipt, squeak, squeakable, tx } =
      await loadFixture(createSqueakFixture));
  });

  it('lets a user create a squeak', () => {
    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('mints an NFT of the squeak content to the creators account', () => {
    expect(accountBalance).to.eq(1);
  });

  it('emits a SqueakCreated event', async () => {
    await expect(tx)
      .to.emit(critter, 'SqueakCreated')
      .withArgs(
        ahmed.address,
        ethers.utils.formatBytes32String(content),
        squeakId
      );
  });

  it('reverts when the squeak content is empty', async () => {
    await expect(critter.createSqueak('')).to.be.revertedWithCustomError(
      squeakable,
      'SqueakEmpty'
    );
  });

  it('reverts when the squeak content is too long', async () => {
    await expect(
      critter.createSqueak(`Did you ever hear the tragedy of Darth Plagueis The
    Wise? I thought not. It’s not a story the Jedi would tell you. It’s a Sith
    legend. Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise
    he could use the Force to influence the midichlorians to create life...`)
    ).to.be.revertedWithCustomError(squeakable, 'SqueakTooLong');
  });

  it('reverts when the user does not have an account', async () => {
    await expect(
      critter.connect(carlos).createSqueak(content)
    ).to.be.revertedWithCustomError(critter, 'InvalidAccount');
  });

  it('reverts when the account is not active', async () => {
    await expect(
      critter.connect(barbie).createSqueak('come on barbie, lets go party')
    ).to.be.revertedWithCustomError(critter, 'InvalidAccountStatus');
  });
});

import { ethers, expect, loadFixture, run } from './setup';
import { MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Critter,
  SignerWithAddress,
  Squeak,
} from '../types';

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
    squeakId: BigNumber,
    tx: ContractTransaction;

  const createSqueakFixture = async () => {
    [owner, ahmed, barbie, carlos] = await ethers.getSigners();
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // contract owner grants ahmed the moderator role
    await critter.connect(owner).grantRole(MODERATOR_ROLE, ahmed.address);

    // ahmed creates a squeak
    ({ receipt, squeakId, tx } = await run('create-squeak', {
      content,
      contract: critter,
      signer: ahmed,
    }));

    // barbie creates an account
    await critter.connect(barbie).createAccount('barbie');

    // ahmed bans barbie
    await critter.updateStatus(barbie.address, Status.Banned);

    return {
      accountBalance: await critter.balanceOf(ahmed.address),
      critter,
      receipt,
      squeak: await critter.squeaks(squeakId),
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ accountBalance, critter, receipt, squeak, tx } = await loadFixture(
      createSqueakFixture
    ));
  });

  it('lets a user create a squeak', () => {
    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('mints an NFT of the squeak content to the creators account', () => {
    expect(accountBalance).to.eq(1);
  });

  it('emits a SqueakCreated event', async () => {
    await expect(tx)
      .to.emit(critter, 'SqueakCreated')
      .withArgs(ahmed.address, squeakId, receipt.blockNumber, content);
  });

  it('reverts when the squeak content is empty', async () => {
    await expect(critter.createSqueak('')).to.be.revertedWithCustomError(
      critter,
      'SqueakEmpty'
    );
  });

  it('reverts when the squeak content is too long', async () => {
    await expect(
      critter.createSqueak(`Did you ever hear the tragedy of Darth Plagueis The
    Wise? I thought not. It’s not a story the Jedi would tell you. It’s a Sith
    legend. Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise
    he could use the Force to influence the midichlorians to create life...`)
    ).to.be.revertedWithCustomError(critter, 'SqueakTooLong');
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

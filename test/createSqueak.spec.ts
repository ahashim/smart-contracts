import { MINTER_ROLE, MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Critter,
  LibraryContracts,
  SignerWithAddress,
  Squeak,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('createSqueak', () => {
  const content = 'hello blockchain!';
  const rawContent = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(content));
  let accountBalance: BigNumber,
    ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    daphne: SignerWithAddress,
    critter: Critter,
    libraries: LibraryContracts,
    owner: SignerWithAddress,
    receipt: ContractReceipt,
    squeak: Squeak,
    squeakId: BigNumber,
    tx: ContractTransaction;

  const createSqueakFixture = async () => {
    [owner, ahmed, barbie, carlos, daphne] = await ethers.getSigners();
    ({ critter, libraries } = await run('deploy-contracts'));
    critter = critter.connect(ahmed);

    // ahmed, barbie, and daphne create accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, daphne],
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
    await critter.updateStatus(barbie.address, Status.Banned);

    // contract owner revokes daphne's minter role
    await critter.connect(owner).revokeRole(MINTER_ROLE, daphne.address);

    return {
      accountBalance: await critter.balanceOf(ahmed.address),
      critter,
      libraries,
      receipt,
      squeak: await critter.squeaks(squeakId),
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ accountBalance, critter, libraries, receipt, squeak, tx } =
      await loadFixture(createSqueakFixture));
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
      .withArgs(
        ahmed.address,
        ethers.utils.formatBytes32String(content),
        squeakId
      );
  });

  it('reverts when the squeak content is empty', async () => {
    await expect(critter.createSqueak('')).to.be.revertedWithCustomError(
      libraries.libSqueakable,
      'SqueakEmpty'
    );
  });

  it('reverts when the squeak content is too long', async () => {
    await expect(
      critter.createSqueak(`Did you ever hear the tragedy of Darth Plagueis The
    Wise? I thought not. It’s not a story the Jedi would tell you. It’s a Sith
    legend. Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise
    he could use the Force to influence the midichlorians to create life...`)
    ).to.be.revertedWithCustomError(libraries.libSqueakable, 'SqueakTooLong');
  });

  it('reverts when the user does not have a minter role', async () => {
    await expect(
      critter.connect(daphne).createSqueak(content)
    ).to.be.revertedWith(
      `AccessControl: account ${daphne.address.toLowerCase()} is missing role ${MINTER_ROLE.toLowerCase()}`
    );
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

import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Wallet,
} from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('createSqueak', () => {
  let critter: Critter;
  let content = 'hello blockchain!';
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeak: Squeak;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const createSqueakFixture = async () => {
    critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // contract owner grants ahmed the moderator role
    await critter
      .connect(owner)
      .grantRole(ethers.utils.id(MODERATOR_ROLE), ahmed.address);

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
      content,
      critter,
      receipt,
      squeak: await critter.squeaks(squeakId),
      tx,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ content, critter, receipt, squeak, tx } = await loadFixture(
      createSqueakFixture
    ));
  });

  it('lets a user create a squeak', async () => {
    const rawContent = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(content));

    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('emits a SqueakCreated event', async () => {
    await expect(tx)
      .to.emit(critter, 'SqueakCreated')
      .withArgs(ahmed.address, squeakId, receipt.blockNumber, content);
  });

  it('reverts when the squeak content is empty', async () => {
    await expect(critter.createSqueak('')).to.be.reverted;
  });

  it('reverts when the squeak content is too long', async () => {
    const longContent = `Did you ever hear the tragedy of Darth Plagueis The
    Wise? I thought not. It’s not a story the Jedi would tell you. It’s a Sith
    legend. Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise
    he could use the Force to influence the midichlorians to create life...`;

    await expect(critter.createSqueak(longContent)).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(critter.connect(carlos).createSqueak(content)).to.be.reverted;
  });

  it('reverts when the account is not active', async () => {
    await expect(
      critter.connect(barbie).createSqueak('come on barbie, lets go party')
    ).to.be.reverted;
  });
});

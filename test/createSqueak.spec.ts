import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { MODERATOR_ROLE } from '../constants';
import { Status } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('createSqueak', () => {
  const content = 'hello blockchain!';
  const rawContent = hardhat.ethers.utils.hexlify(
    hardhat.ethers.utils.toUtf8Bytes(content)
  );
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
    [owner, ahmed, barbie, carlos] = await hardhat.ethers.getSigners();
    critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // contract owner grants ahmed the moderator role
    await critter
      .connect(owner)
      .grantRole(hardhat.ethers.utils.id(MODERATOR_ROLE), ahmed.address);

    // ahmed creates a squeak
    ({ receipt, squeakId, tx } = await hardhat.run('create-squeak', {
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

  it('lets a user create a squeak', async () => {
    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(rawContent);
  });

  it('mints a token to the creators account', async () => {
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

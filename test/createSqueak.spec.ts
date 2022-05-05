import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';

// types
import type {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';
import type { Squeak } from '../types';

describe('createSqueak', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let receipt: ContractReceipt;
  let squeak: Squeak;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const createSqueakFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;
    await critter.createAccount('ahmed');

    return critter;
  };

  beforeEach('deploy test contract, ahmed creates an account', async () => {
    critter = await loadFixture(createSqueakFixture);
  });

  // test variables
  const content = 'hello blockchain!';
  const longContent = `Did you ever hear the tragedy of Darth Plagueis The Wise?
    I thought not. It’s not a story the Jedi would tell you. It’s a Sith legend.
    Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise he could
    use the Force to influence the midichlorians to create life...`;

  it('lets a user create a squeak', async () => {
    tx = await critter.createSqueak(content);
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);
    squeak = await critter.squeaks(squeakId);

    expect(squeak.blockNumber).to.eq(receipt.blockNumber);
    expect(squeak.author).to.eq(ahmed.address);
    expect(squeak.owner).to.eq(ahmed.address);
    expect(squeak.content).to.eq(content);
  });

  it('emits a SqueakCreated event', async () => {
    tx = await critter.createSqueak(content);
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    const { tokenId: squeakId } = event!.args!;

    await expect(tx)
      .to.emit(critter, 'SqueakCreated')
      .withArgs(ahmed.address, squeakId, receipt.blockNumber, content);
  });

  it('reverts when the squeak content is empty', async () => {
    await expect(critter.createSqueak('')).to.be.reverted;
  });

  it('reverts when the squeak content is too long', async () => {
    await expect(critter.createSqueak(longContent)).to.be.reverted;
  });

  it('reverts when the user does not have an account', async () => {
    await expect(critter.connect(owner).createSqueak(content)).to.be.reverted;
  });

  it('reverts when the contract is paused', async () => {
    await critter.connect(owner).pause();
    await expect(critter.createSqueak(content)).to.be.reverted;
  });
});

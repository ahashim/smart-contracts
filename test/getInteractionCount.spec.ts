import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import { CONTRACT_NAME, CONTRACT_INITIALIZER } from '../constants';
import { Interaction } from '../enums';

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

describe('getInteractionCount', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet, carlos: Wallet;
  let receipt: ContractReceipt;
  let squeakId: BigNumber;
  let tx: ContractTransaction;

  // test variables
  const overflow = ethers.constants.MaxUint256.add(ethers.BigNumber.from(1));

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie, carlos]);
  });

  const getInteractionCountFixture = async () => {
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const critter = (
      await upgrades.deployProxy(factory, CONTRACT_INITIALIZER)
    ).connect(ahmed) as Critter;

    // everybody creates an account
    [ahmed, barbie, carlos].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // ahmed posts a squeak
    tx = await critter.createSqueak('hello blockchain!');
    receipt = await tx.wait();
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed resqueaks it
    await critter.interact(squeakId, Interaction.Resqueak, {
      value: await critter.getInteractionFee(Interaction.Resqueak),
    });

    // barbie likes it
    await critter.connect(barbie).interact(squeakId, Interaction.Like, {
      value: await critter.getInteractionFee(Interaction.Like),
    });

    // carlos dislikes it
    await critter.connect(carlos).interact(squeakId, Interaction.Dislike, {
      value: await critter.getInteractionFee(Interaction.Dislike),
    });

    return { critter, squeakId };
  };

  beforeEach(
    'deploy test contract, ahmed creates a squeak which is interacted with',
    async () => {
      ({ critter, squeakId } = await loadFixture(getInteractionCountFixture));
    }
  );

  it('gets the dislike count of a squeak', async () => {
    expect(
      await critter.getInteractionCount(squeakId, Interaction.Dislike)
    ).to.equal(1);
  });

  it('gets the like count of a squeak', async () => {
    expect(
      await critter.getInteractionCount(squeakId, Interaction.Like)
    ).to.equal(1);
  });

  it('gets the resqueak count of a squeak', async () => {
    expect(
      await critter.getInteractionCount(squeakId, Interaction.Resqueak)
    ).to.equal(1);
  });

  it('returns zero when querying for a nonexistent squeak', async () => {
    expect(await critter.getInteractionCount(420, Interaction.Like)).to.equal(
      0
    );
  });

  it('reverts if the squeakId is out of bounds', async () => {
    await expect(critter.getInteractionCount(-1, Interaction.Like)).to.be
      .reverted;
    await expect(critter.getInteractionCount(overflow, Interaction.Like)).to.be
      .reverted;
  });

  it('reverts when passing in an invalid interaction type', async () => {
    await expect(critter.getInteractionCount(squeakId, 69)).to.be.reverted;
  });
});

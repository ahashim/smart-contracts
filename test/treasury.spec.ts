import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { Interaction } from '../enums';

// types
import { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('treasury', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet, barbie: Wallet;
  let dislikeFee: BigNumber, squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed, barbie]);
  });

  const treasuryFixture = async () => {
    // deploy contract
    const critter = (await run('deploy-contract')).connect(ahmed);

    // everybody creates an account
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

    // barbie dislikes it
    dislikeFee = await critter.fees(Interaction.Dislike);
    await critter
      .connect(barbie)
      .interact(squeakId, Interaction.Dislike, { value: dislikeFee });

    return { critter, dislikeFee };
  };

  it('gets the current treasury value', async () => {
    ({ critter, dislikeFee } = await loadFixture(treasuryFixture));

    expect(await critter.treasury()).to.eq(dislikeFee);
  });
});

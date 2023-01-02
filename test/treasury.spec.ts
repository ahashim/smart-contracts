import { Interaction } from '../enums';
import type { BigNumber, Critter, SignerWithAddress } from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('treasury', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    dislikeFee: BigNumber,
    squeakId: BigNumber;

  const treasuryFixture = async () => {
    [, ahmed, barbie] = await ethers.getSigners();
    const critter = (await run('deploy-critter-contract')).critter.connect(
      ahmed
    );

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

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, dislikeFee } = await loadFixture(treasuryFixture));
  });

  it('gets the current treasury value', async () => {
    expect(await critter.treasury()).to.eq(dislikeFee);
  });
});

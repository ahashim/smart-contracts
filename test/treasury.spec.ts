import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('treasury', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    dislikeFee: BigNumber,
    squeakId: BigNumber;

  const treasuryFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    const critter = (await hardhat.run('deploy-contract')).connect(ahmed);

    // everybody creates an account
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // ahmed posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
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

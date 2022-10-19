import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('isViral', () => {
  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    nonViralSqueakId: BigNumber,
    viralSqueakId: BigNumber;

  const isViralFixture = async () => {
    [, ahmed, barbie, carlos] = await hardhat.ethers.getSigners();
    // deploy contract with a lower virality threshold
    critter = (
      await hardhat.run('deploy-contract', {
        viralityThreshold: 1,
      })
    ).connect(ahmed);

    // creates accounts
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie, carlos],
      contract: critter,
    });

    // ahmed creates a squeak
    ({ squeakId: viralSqueakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed & barbie resqueak it
    [ahmed, barbie].forEach(async (signer) => {
      await hardhat.run('interact', {
        contract: critter,
        interaction: Interaction.Resqueak,
        signer,
        squeakId: viralSqueakId,
      });
    });

    // carlos likes it, and thus makes it eligible for virality
    await hardhat.run('interact', {
      contract: critter,
      interaction: Interaction.Like,
      signer: carlos,
      squeakId: viralSqueakId,
    });

    ({ squeakId: nonViralSqueakId } = await hardhat.run('create-squeak', {
      content: 'i like turtles',
      contract: critter,
      signer: carlos,
    }));

    return { critter, nonViralSqueakId, viralSqueakId };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ critter, nonViralSqueakId, viralSqueakId } = await loadFixture(
      isViralFixture
    ));
  });

  it('returns true when a squeak is viral', async () => {
    expect(await critter.isViral(viralSqueakId)).to.be.true;
  });

  it('returns false when a squeak is not viral', async () => {
    expect(await critter.isViral(nonViralSqueakId)).to.be.false;
  });

  it('reverts when looking up an unknown squeak', async () => {
    await expect(critter.isViral(420)).to.be.revertedWithCustomError(
      critter,
      'SqueakDoesNotExist'
    );
  });
});

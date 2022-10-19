import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { TREASURER_ROLE, PLATFORM_FEE } from '../constants';
import { Interaction } from '../enums';

// types
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { BigNumber } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('updateInteractionFee', () => {
  const updatedFee = hardhat.ethers.utils.parseEther('0.0001');

  let ahmed: SignerWithAddress,
    barbie: SignerWithAddress,
    critter: Critter,
    likeFee: BigNumber,
    squeakId: BigNumber;

  const updateInteractionFeeFixture = async () => {
    [, ahmed, barbie] = await hardhat.ethers.getSigners();
    critter = await hardhat.run('deploy-contract');

    // everybody creates an account
    await hardhat.run('create-accounts', {
      accounts: [ahmed, barbie],
      contract: critter,
    });

    // the owner grants ahmed the TREASURER_ROLE
    await critter.grantRole(
      hardhat.ethers.utils.id(TREASURER_ROLE),
      ahmed.address
    );

    // ahmed increases the interaction fee for "like"
    await critter.updateInteractionFee(Interaction.Like, updatedFee);

    // barbie posts a squeak
    ({ squeakId } = await hardhat.run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: barbie,
    }));

    return {
      critter,
      likeFee: await critter.fees(Interaction.Like),
      squeakId,
    };
  };

  beforeEach(
    'load deployed contract fixture, ahmed updates the price',
    async () => {
      ({ critter, likeFee, squeakId } = await loadFixture(
        updateInteractionFeeFixture
      ));
    }
  );

  it('allows TREASURER_ROLE to update an interaction fee', () => {
    expect(likeFee).to.eq(updatedFee);
  });

  it('reverts when the update fee is not sufficient', async () => {
    await expect(
      critter
        .connect(ahmed)
        .interact(squeakId, Interaction.Like, { value: PLATFORM_FEE })
    ).to.be.revertedWithCustomError(critter, 'InsufficientFunds');
  });

  it('reverts when someone other than the TREASURER_ROLE tries to update an interaction fee', async () => {
    await expect(
      critter
        .connect(barbie)
        .updateInteractionFee(Interaction.Dislike, updatedFee)
    ).to.be.reverted;
  });
});

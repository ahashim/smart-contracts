import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';

// types
import type { BigNumber, Wallet } from 'ethers';
import type { Critter } from '../typechain-types/contracts';

describe('ownerOf', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const ownerOfFixture = async () => {
    const critter = (await run('deploy-contract')).connect(ahmed);

    // ahmed creates an account
    await critter.createAccount('ahmed');

    // ahmed posts a squeak
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    return { critter, squeakId };
  };

  beforeEach(
    'load deployed contract fixture, ahmed creates an account & posts a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(ownerOfFixture));
    }
  );

  it('gets the owner address of a squeak', async () => {
    expect(await critter.ownerOf(squeakId)).to.equal(ahmed.address);
  });

  it('reverts if the squeak does not exist', async () => {
    await expect(critter.ownerOf(420)).to.be.reverted;
  });
});

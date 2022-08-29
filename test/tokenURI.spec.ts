import { expect } from 'chai';
import { ethers, run, waffle } from 'hardhat';
import { BASE_TOKEN_URI } from '../constants';

// types
import { BigNumber, Wallet } from 'ethers';
import { Critter } from '../typechain-types/contracts';

describe('tokenURI', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet, ahmed: Wallet;
  let squeakId: BigNumber;

  before('create fixture loader', async () => {
    [owner, ahmed] = await (ethers as any).getSigners();
    loadFixture = waffle.createFixtureLoader([owner, ahmed]);
  });

  const tokenURIFixture = async () => {
    // deploy contract
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
    'load deployed contract fixture, and ahmed creates a squeak',
    async () => {
      ({ critter, squeakId } = await loadFixture(tokenURIFixture));
    }
  );

  it('returns the URI of a squeak', async () => {
    expect(await critter.tokenURI(squeakId)).to.eq(BASE_TOKEN_URI + squeakId);
  });

  it('reverts when querying for a non-existent squeak', async () => {
    await expect(critter.tokenURI(420)).to.be.reverted;
  });
});

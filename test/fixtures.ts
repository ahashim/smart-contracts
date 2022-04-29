import { ethers, run } from 'hardhat';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Contract } from 'ethers';

/**
 * Freshly deployed contract without any Critter accounts
 * @accounts: []
 * @squeaks: []
 * @dislikes: []
 * @likes: []
 */
export const freshDeploy = async () => await run('deployContract');

/**
 * Freshly deployed contract with a single Critter account.
 * @accounts: ['ahmed']
 * @squeaks: []
 * @dislikes: []
 * @likes: []
 */
export const oneAccount = async () => {
  const contract = await freshDeploy();
  const [, ahmed] = await ethers.getSigners();

  // ahmed creates an account
  await contract.connect(ahmed).createAccount('ahmed');

  return contract;
};

/**
 * Freshly deployed contract with a two Critter accounts.
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: []
 * @dislikes: []
 * @likes: []
 */
export const twoAccounts = async () => {
  const contract = await freshDeploy();
  const [, ahmed, barbie] = await ethers.getSigners();

  // ahmed creates an account
  await run('createAccount', {
    contract,
    signer: ahmed,
    username: 'ahmed',
  });

  // barbie creates an account
  await run('createAccount', {
    contract,
    signer: barbie,
    username: 'barbie',
  });

  return contract;
};

/**
 * Freshly deployed contract with a two Critter accounts, and one squeak from
 * ahmed.
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: [1]
 * @dislikes: []
 * @likes: []
 */
export const twoAccountsOneSqueak = async () => {
  const contract = await twoAccounts();
  const [, ahmed] = await ethers.getSigners();

  // ahmed creates squeak
  const event = await run('createSqueak', {
    contract,
    signer: ahmed,
    content: 'this is the wei',
  });
  const { tokenId } = event.args;

  return [contract, tokenId];
};

/**
 * Freshly deployed contract with a two Critter accounts, and one squeak from
 * ahmed, and barbie disliked it
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: [1]
 * @dislikes: [1 => [barbie]]
 * @likes: []
 */
export const twoAccountsOneDislikedSqueak = async () => {
  const [contract, tokenId] = await twoAccountsOneSqueak();
  const [, , barbie] = await ethers.getSigners();

  // barbie dislikes ahmeds squeak
  await run('dislikeSqueak', {
    contract,
    signer: barbie,
    tokenId,
  });

  return [contract, tokenId];
};

/**
 * Freshly deployed contract with a two Critter accounts, and one squeak from
 * ahmed, and barbie liked it
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: [1]
 * @dislikes: []
 * @likes: [1 => [barbie]]
 */
export const twoAccountsOneLikedSqueak = async () => {
  const [contract, tokenId] = await twoAccountsOneSqueak();
  const [, , barbie] = await ethers.getSigners();

  // barbie dislikes ahmeds squeak
  await run('likeSqueak', {
    contract,
    signer: barbie,
    tokenId,
  });

  return [contract, tokenId];
};

/**
 * Freshly deployed contract with a three Critter accounts, and one squeak from
 * ahmed, which barbie liked and carlos disliked
 * @accounts: ['ahmed', 'barbie', 'carlos']
 * @squeaks: [1]
 * @dislikes: [1 => [barbie]]
 * @likes: [1 => [carlos]]
 */
export const threeAccountsOneSqueakLikedAndDisliked = async () => {
  const contract = await twoAccounts();
  const [, ahmed, barbie, carlos] = await ethers.getSigners();

  // carlos creates an account
  await run('createAccount', {
    contract,
    signer: carlos,
    username: 'carlos',
  });

  // ahmed creates a squeak
  const event = await run('createSqueak', {
    contract,
    signer: ahmed,
    content: 'hello there!',
  });
  const { tokenId } = event.args;

  // barbie likes it
  await run('likeSqueak', {
    contract,
    signer: barbie,
    tokenId,
  });

  // carlos likes it
  await run('dislikeSqueak', {
    contract,
    signer: carlos,
    tokenId,
  });

  return [contract, tokenId];
};

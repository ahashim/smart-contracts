import { ethers, run } from 'hardhat';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Contract } from 'ethers';

/**
 * Freshly deployed contract without any Critter accounts
 * @accounts: []
 * @squeaks: []
 */
export const freshDeploy = async () => await run('deployContract');

/**
 * Freshly deployed contract with a single Critter account.
 * @accounts: ['ahmed']
 * @squeaks: []
 */
export const oneAccount = async () => {
  const contract = await freshDeploy();
  const [, ahmed] = await ethers.getSigners();

  // ahmed creates an account
  await run('createAccount', {
    contract,
    signer: ahmed,
    username: 'ahmed',
  });

  return contract;
};

/**
 * Freshly deployed contract with a two Critter accounts.
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: []
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
 * ahmed.
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: [1]
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
 * ahmed.
 * @accounts: ['ahmed', 'barbie']
 * @squeaks: [1]
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

import { ethers, run } from 'hardhat';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Contract } from 'ethers';

/**
 * Freshly deployed contract without any Critter accounts
 */
export const freshDeploy = async () => await run('deployContract');

/**
 * Freshly deployed contract with a single Critter account
 * @accounts: 'ahmed'
 */
export const singleAccount = async () => {
  const contract = await freshDeploy();
  const [, ahmed] = await ethers.getSigners();

  await run('createAccount', {
    contract,
    signer: ahmed,
    username: 'ahmed',
  });

  return contract;
};

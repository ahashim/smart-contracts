import { task } from 'hardhat/config';
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

// types
import type { Contract, ContractFactory } from 'ethers';

task(
  'deployContract',
  'Deploys upgradeable contracts via a proxy from owner account',
  async (_, { ethers, upgrades }) => {
    // deploy contract
    const factory: ContractFactory = await ethers.getContractFactory(
      CONTRACT_NAME
    );
    const contract: Contract = await upgrades.deployProxy(
      factory,
      CONTRACT_INITIALIZER
    );

    return contract;
  }
);

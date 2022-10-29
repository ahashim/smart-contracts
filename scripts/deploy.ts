// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
import { ethers, upgrades } from 'hardhat';

import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const factory = await ethers.getContractFactory(CONTRACT_NAME);
  const contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

  console.log('Critter deployed to:', contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

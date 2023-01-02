import { task } from 'hardhat/config';

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  'blockNumber',
  'Prints the current block number',
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log('Current block number: ' + blockNumber);
    });
  }
);

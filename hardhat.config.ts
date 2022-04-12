import 'dotenv/config';
import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'hardhat-watcher';
import 'solidity-coverage';
import { CONTRACT_INITIALIZER } from './test/constants';

const config: HardhatUserConfig = {
  contractSizer: {
    strict: true,
  },
  defaultNetwork: 'hardhat',
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
    enabled: !!process.env.REPORT_GAS,
  },
  networks: {
    hardhat: {},
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  watcher: {
    ci: {
      files: ['contracts/**/*.sol', 'test/**/*.ts'],
      tasks: ['test', 'size-contracts'],
    },
  },
};

// User defined tasks
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

task(
  'critterInit',
  'Deploys Critter contracts and sets up an owner account when using the hardhat console',
  async (_, { ethers, upgrades }) => {
    // deploy contract
    const factory = await ethers.getContractFactory('Critter');
    const contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    // create an owner account
    const createAccountTx = await contract.createAccount('a-rock');
    await createAccountTx.wait();

    // return contract instance
    return contract;
  }
);

task(
  'prepare',
  'Compiles the latest contracts, generates a contract size report & a test coverage report',
  async function (_, { run }) {
    // compile contracts
    await run('compile');
    console.log('\n');

    // contract sizing report
    console.log('\x1b[1m%s', 'Contract Size'); // making the title bold
    console.log('%s\x1b[0m', '============='); // reset formatting after separator
    await run('size-contracts');
    console.log('\n');

    // test coverage report
    await run('coverage');
  }
);

export default config;

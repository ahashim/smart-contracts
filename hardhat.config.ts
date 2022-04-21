import 'dotenv/config';
import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'hardhat-watcher';
import 'solidity-coverage';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';

// task variables
import { CONTRACT_INITIALIZER, CONTRACT_NAME, USERNAME } from './constants';

// allow BigNumber comparisons in tests
chai.use(solidity);

const config: HardhatUserConfig = {
  contractSizer: {
    strict: true,
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
    enabled: !!process.env.REPORT_GAS,
  },
  networks: {},
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
      tasks: ['test'],
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
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    // create an owner account
    const createAccountTx = await contract.createAccount(USERNAME);
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

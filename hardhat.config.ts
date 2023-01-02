// environment variables
import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@symblox/hardhat-abi-gen';
import 'hardhat-contract-sizer';
import 'hardhat-watcher';
// task files
import './tasks/contract';
import './tasks/deploy';
import './tasks/network';

// hardhat
import type { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  abiExporter: {
    clear: true,
    flat: true,
    only: ['Critter.sol'],
  },
  contractSizer: {
    strict: true,
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
    enabled: !!process.env.REPORT_GAS,
  },
  mocha: {
    timeout: 0,
  },
  networks: {},
  solidity: {
    settings: {
      optimizer: {
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
          },
        },
        enabled: true,
        runs: 200,
      },
    },
    version: '0.8.17',
  },
  watcher: {
    compile: {
      files: ['contracts/**/*.sol'],
      tasks: ['compile'],
    },
    ci: {
      files: ['contracts/**/*.sol', 'test/**/*.ts'],
      tasks: ['test'],
    },
  },
};

export default config;

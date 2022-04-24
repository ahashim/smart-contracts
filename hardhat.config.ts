// environment variables
import 'dotenv/config';

// hardhat
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'hardhat-watcher';
import 'solidity-coverage';

// task files
import './tasks/contract';
import './tasks/network';
import './tasks/project';

// test harness
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
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
      files: [
        './constants.ts',
        'contracts/**/*.sol',
        'test/**/*.ts',
        'tasks/**/*.ts',
      ],
      tasks: ['test'],
    },
  },
};

export default config;

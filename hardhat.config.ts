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

const config: HardhatUserConfig = {
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
    version: '0.8.16',
  },
  watcher: {
    ci: {
      files: [
        'constants.ts',
        'contracts/**/*.sol',
        'enums.ts',
        'tasks/**/*.ts',
        'test/**/*.ts',
        'types.ts',
      ],
      tasks: ['test'],
    },
  },
};

export default config;

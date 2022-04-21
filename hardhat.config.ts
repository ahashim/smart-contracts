// init .env files
import 'dotenv/config';

// hardhat
import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'hardhat-watcher';
import 'solidity-coverage';

// tests
import chai from 'chai';
import { solidity } from 'ethereum-waffle';

// custom tasks
import './tasks/network';
import './tasks/contract';

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

export default config;

import { subtask, task } from 'hardhat/config';
import { CONTRACT_INITIALIZER, CONTRACT_NAME } from '../constants';
import type { Contract } from 'ethers';

subtask(
  'deployContract',
  'Deploys upgradeable contracts via a proxy',
  async (_, { ethers, upgrades }) => {
    // deploy contract
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    const contract = await upgrades.deployProxy(factory, CONTRACT_INITIALIZER);

    return contract;
  }
);

subtask(
  'createAccounts',
  'Creates an owner account + 2 user accounts',
  async ({ contract }: { contract: Contract }, { ethers }) => {
    const [owner, ahmed, barbie] = await ethers.getSigners();

    // create an owner account
    const createOwnerAccountTx = await contract
      .connect(owner)
      .createAccount('owner');
    await createOwnerAccountTx.wait();

    // create ahmed's account
    const createAhmedAccountTx = await contract
      .connect(ahmed)
      .createAccount('ahmed');
    await createAhmedAccountTx.wait();

    // create barbie's account
    const createBarbieAccountTx = await contract
      .connect(barbie)
      .createAccount('barbie');
    await createBarbieAccountTx.wait();

    return [owner, ahmed, barbie];
  }
);

task(
  'initialize',
  'Deploys contracts and sets up 1 owner + 2 regular accounts',
  async (_, { run }) => {
    const contract = await run('deployContract');
    const accounts = await run('createAccounts', { contract });

    // return contract instance
    return [contract, accounts];
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

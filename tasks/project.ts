import { task } from 'hardhat/config';

task(
  'report',
  'Compiles the latest contracts, generates a contract size report & a test coverage report',
  async function (_, { run }) {
    // contract sizing report
    console.log('\x1b[1m%s', 'Contract Size'); // making the title bold
    console.log('%s\x1b[0m', '============='); // reset formatting after separator
    await run('size-contracts');
    console.log('\n');

    // test coverage report
    await run('coverage');
  }
);

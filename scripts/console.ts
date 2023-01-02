import hardhat from 'hardhat';
import repl from 'repl';

import { CRITTER_SYMBOL } from '../constants';

async function main() {
  // start repl with options
  const r = repl.start({
    prompt: `🦔 <${CRITTER_SYMBOL}>: `,
    useColors: true,
  });

  // start progress indicator
  process.stdout.write('Warming up...');

  // deploy the contract
  const contract = await hardhat.run('deploy-contract');

  // initialize accounts
  const names = ['owner', 'ahmed', 'barbie', 'carlos'];
  const signers = await hardhat.ethers.getSigners();

  for (let i = 0; i < names.length; i++) {
    const signer = signers[i];
    const username = names[i];
    const user = contract.connect(signer);

    // create critter accounts for everybody except the owner
    if (i > 0) await user.createAccount(username);

    // add them to the repl
    r.context[username] = user;
  }

  // add hardhat context
  r.context.hh = hardhat;

  // this is where the fun begins
  console.log(' ready! 🐁');
  console.log('============================');
  console.log('Hardhat: hh');
  console.log('Owner: owner');
  console.log('Users: ahmed, barbie, carlos');
  console.log('============================');
  process.stdout.write('\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import repl from 'repl';
import hardhat from 'hardhat';
import { SYMBOL } from '../constants';

async function main() {
  // start repl with options
  const r = repl.start({
    prompt: `🦔 <${SYMBOL}>: `,
    useColors: true,
  });

  // start progress indicator
  process.stdout.write('Warming up...');

  // deploy contract + create accounts
  const signers = await hardhat.ethers.getSigners();
  const users = ['owner', 'ahmed', 'barbie', 'carlos'];
  const contract = await hardhat.run('deployContract');

  // assign hardhat context
  r.context.hh = hardhat;
  r.context.contract = contract;

  // create Critter accounts
  for (let i = 0; i < users.length; i++) {
    const signer = signers[i];
    const username = users[i];

    hardhat.run('createAccount', {
      contract,
      signer,
      username,
    });

    // add it to the repl context
    r.context[username] = signer;
  }

  // this is where the fun begins
  process.stdout.write(' ready! 🐁\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

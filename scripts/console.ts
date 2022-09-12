import repl from 'repl';
import hardhat from 'hardhat';
import { CONTRACT_SYMBOL, PLATFORM_FEE } from '../constants';

async function main() {
  // start repl with options
  const r = repl.start({
    prompt: `🦔 <${CONTRACT_SYMBOL}>: `,
    useColors: true,
  });

  // start progress indicator
  process.stdout.write('Warming up...');

  // deploy contract + create accounts
  const signers = await hardhat.ethers.getSigners();
  const users = ['owner', 'ahmed', 'barbie', 'carlos'];
  const contract = await hardhat.run('deploy-contract');

  // assign hardhat & contract context
  r.context.hh = hardhat;
  r.context.critter = contract;
  r.context.platformFee = PLATFORM_FEE;

  // create Critter accounts
  for (let i = 0; i < users.length; i++) {
    const signer = signers[i];
    const username = users[i];

    // create the account
    await contract.connect(signer).createAccount(username);

    // add it to the repl
    r.context[username] = signer;
  }

  // this is where the fun begins
  process.stdout.write(' ready! 🐁\n');
  console.log('Hardhat: hh');
  console.log('Contract: critter');
  console.log('Platform fee: platformFee');
  console.log('Owner account: owner');
  console.log('User accounts: ahmed, barbie, carlos');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

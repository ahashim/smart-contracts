import repl from 'repl';
import hardhat from 'hardhat';
import { SYMBOL } from '../constants';

async function main() {
  // start repl with options
  const r = repl.start({
    prompt: `🦔 <${SYMBOL}>: `,
    useColors: true,
  });

  // start progress
  process.stdout.write('Warming up...');

  // get contract + account info
  const [contract, accounts] = await hardhat.run('initialize', {
    numberOfAccounts: 3,
  });
  const [owner, ahmed, barbie] = accounts;

  // assign context
  r.context.hh = hardhat;
  r.context.owner = owner;
  r.context.ahmed = ahmed;
  r.context.barbie = barbie;
  r.context.contract = contract;

  // this is where the fun begins
  process.stdout.write(' ready! 🐁\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

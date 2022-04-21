import repl from 'repl';
import hardhat from 'hardhat';

async function main() {
  // start repl & get accounts
  const r = repl.start(`[CRTTR 🐹]: `);
  const [owner, ahmed, barbie] = await hardhat.ethers.getSigners();

  // assign context
  r.context.hh = hardhat;
  r.context.owner = owner;
  r.context.ahmed = ahmed;
  r.context.barbie = barbie;
  r.context.contract = await hardhat.run('critterInit');

  // this is where the fun begins
  console.log(`Ready... 🐁`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

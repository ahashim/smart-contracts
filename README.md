# 📜 Smart Contracts

The underlying smart-contracts that power [Critter](https://github.com/ahashim/critter).

Requirements:
* [docker](https://docker.com)
* [make](https://www.gnu.org/software/make)

### Start a local node

```bash
make node
```

Starts a local [hardhat network](https://hardhat.org/hardhat-network/docs/overview)
node and opens a JSON RPC port on `localhost:8545`.

### Start the `CRTTR` console

```bash
make console
```

Deploys all Critter contracts to the local node, and  opens a [node.js repl](https://nodejs.org/api/repl.html#repl)
to interact with them. Under the hood, it uses the [ethers](https://docs.ethers.io/)
library to communicate with the deployed contracts, so its [full API](https://docs.ethers.io/v5/api/)
is available to use.

Additional objects include:

- `hh`: an instance of hardhat, [including all available tasks](https://github.com/ahashim/critter/blob/main/tasks/contract.ts#L15).
- `ahmed`, `barbie`, `carlos`, `owner`: each returns an individual contract instance connected to the respective signer.
  - Each signer is given 10000 ETH.
  - Each signer (except `owner`) has a Critter account created.

All public [contract methods](https://github.com/ahashim/smart-contracts/tree/main/contracts/interfaces)
are available on these instances. For example:

```javascript
🦔 <CRTTR>: await ahmed.createSqueak('hello blockchain!');
...
🦔 <CRTTR>: await ahmed.balanceOf(ahmed.signer.address); // BigNumber { value: "1" }
```

### Run unit tests

```bash
make test
```

This also reports the gas costs for every contract function called.

### Test coverage report

```bash
make coverage
```

### Contract size report

```bash
make size
```

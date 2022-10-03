# 📜 Smart Contracts

The underlying smart-contracts that power [Critter](https://github.com/ahashim/critter).

###### **Requirements**: [Docker](https://docker.com) & [make](https://www.gnu.org/software/make)

### Local node

```bash
make node
```

This starts a Critter node on a local [hardhat network](https://hardhat.org/hardhat-network/docs/overview).

### `CRTTR` console

```bash
make console
```

_**note:** requires running a local node_

Starts a [node repl](https://nodejs.org/api/repl.html#repl) to interact with
Critter contracts deployed on the local hardhat network:

- `hh`: an instance of hardhat, [including all available tasks](https://github.com/ahashim/critter/blob/main/tasks/contract.ts#L15).
- `ahmed`, `barbie`, `carlos`, `owner`: each returns an individual contract instance connected to the respective signer.
  - Each signer is given 10000 ETH.
  - Each signer (except `owner`) has a Critter account created.

All [public contract methods](https://github.com/ahashim/smart-contracts/tree/main/contracts/interfaces)
are available on these accounts. For example:

```javascript
  🦔 <CRTTR>: await ahmed.createSqueak('hello blockchain!');
  ...
  🦔 <CRTTR>: await ahmed.balanceOf(ahmed.signer.address); // BigNumber { value: "1" }
```

### Unit Tests

```bash
make test
```

This also reports the gas costs for every contract function called.

#### Test Coverage

```bash
make coverage
```

#### Contract Size

```bash
make size
```

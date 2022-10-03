# 📜 Smart Contracts

The underlying smart-contracts that power [Critter](https://github.com/ahashim/critter).

Please ensure you have [docker](https://docker.com) & [make](https://www.gnu.org/software/make)
installed in order to run them.

### Start a local node

```bash
make node
```

This starts a Critter node on the local [hardhat network](https://hardhat.org/hardhat-network/docs/overview).

### Start the `CRTTR` console

```bash
make console
```

Opens an interactive [node.js repl](https://nodejs.org/api/repl.html#repl) to
interact with the locally deployed contracts. Available objects include:

- `hh`: an instance of hardhat, [including all available tasks](https://github.com/ahashim/critter/blob/main/tasks/contract.ts#L15).
- `ahmed`, `barbie`, `carlos`, `owner`: each returns an individual contract instance connected to the respective signer.
  - Each signer is given 10000 ETH.
  - Each signer (except `owner`) has a Critter account created.
  - All [public contract methods](https://github.com/ahashim/smart-contracts/tree/main/contracts/interfaces)
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

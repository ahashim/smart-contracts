# Critter

An open source peer-to-peer microblogging NFT platform for EVM compatible blockchains.

**Core concepts**:

- Every address is a unique username.
- Every post (called a squeak) is an NFT.
- Squeaks can be bought & sold via a bidding price discovery mechanism.
- Once the author sells their squeak, the ownership is transferred.
- Actions (such as "favorites" & "resqueaks") cost a fee.
- Fees are paid out to the **owner** of said squeak.
- Only owners can delete squeaks.
- Deleting a squeak costs a fee of `blocks elapsed x deletion fee`.

<!-- TODO: setup hosting when working on the client -->
<!-- Visit [https://critter.fyi](https://critter.fyi) to start squeaking on the blockchain. -->

## Local Development

###### **Requirements**:

- [Node JS](https://nodejs.org) version `^14.8.2`.
- Create an `.env` file in the project root with the following info:

```
ETHERSCAN_API_KEY=<your-etherscan-api-key>
PRIVATE_KEY=<your-ethereum-account-private-key>
REPORT_GAS="true" # comment this line out to turn off gas reporting during test runs
ROPSTEN_URL=<your-ropsten-network-api-url>
```

The following commands will allow you to compile & run the contracts on a [local hardhat network](https://hardhat.org).

##### Install dependencies

```bash
npm install
```

##### Compile contracts

```bash
npx hardhat compile
```

##### Start JSON-RPC node

```bash
npx hardhat node
```

##### Open hardhat console

```bash
npx hardhat console
```

## Testing

##### Unit Tests

```bash
npx hardhast test
```

You can increase test performance by skipping the transpilation step of the test files by setting the `TS_NODE_TRANSPILE_ONLY=1` environment variable:

```bash
TS_NODE_TRANSPILE_ONLY=1 npx hardhast test
```

##### Code Coverage

A code coverage report can be generated by running:

```bash
npx hardhat coverage
```

## Project Roadmap

- [x] ERC721 interface compatability.
- [x] Account creation/update & validation.
- [x] Sqeak creation/deletion & validation.
- [ ] Account funding via ERC-20 compatible tokens.
- [ ] Squeak actions + pricing:
  - Favorite
  - Dislike
  - Resqueak
- [ ] Media support for squeaks via IPFS (images, video, documents, etc&hellip;).
  - Can use a pinning service such as [Pinata](https://www.pinata.cloud/) for writes, and [Cloudflare IPFS](https://cloudflare-ipfs.com/ipns/ipfs.io/) for reads.
- [ ] Implement basic moderation status on account structs:
  - Active
  - Suspended
  - Shadow Banned
  - Banned
- [ ] Auction mechanism to bid on posted squeaks
  - Ideally [Vickrey auctions](https://github.com/JoWxW/Vickrey-Auction/blob/master/contracts/VickreyAuction.sol).
- [ ] Harden contract with [security best practices](https://consensys.net/blog/developers/solidity-best-practices-for-smart-contract-security/).
- [ ] Fuzz testing with [Echidna](https://github.com/crytic/echidna).
- [ ] Deploy to an EVM compatible layer 2 solution such as the [zkSync testnet](https://portal.zksync.io/).

## Architecture

#### Smart Contracts

- All smart contracts are written in Solidity & deployed to an EVM compatible Layer 2 solution.
- Deploying to [zkSync](https://portal.zksync.io/) is the current best option.

#### Indexer

- Indexer written in Golang or Node to watch on-chain event logs & create entries from them directly to a database.
  - Will send to the server first to for further validation/sanitization.
  - Upgrade this to use a message queue w/ built-in backpressure out to the database when squeaks volume kicks up.
- Does not need to be highly available (one instance will suffice, and can run locally).
- Deploy with [Fly.io](https://fly.io/).

#### Database

- All user/squeak data not-stored on chain will be in the database.
- Database cluster will likely be MySql/MariaDB to optimize for reads.
  - Using `read + write > # nodes` forumula to get eventual consistency
    - Start with 3 nodes, and always keeping the # of nodes an odd number to avoid the [split-brain problem](https://www.45drives.com/community/articles/what-is-split-brain/).
  - `tokenID`'s can serve as primary keys
    - `uint256` primary key type ensures we will likely not run out before the heat death of the universe.
  - Can partition based on time in the future
    - Critter incentivizes not deleting old squeaks so this should make it easier.
    - Will need to figure out eventual consistency with primary key generation in application layer once we partition.
- Deploy across regions with [Fly.io](https://fly.io/).

#### Client

- User interface written in Typescript & [Preact](https://preactjs.com/).
- Deploy to edge servers (probably on [Cloudflare](https://cloudflare.com)), as well as IPFS.

#### Server

- Server written in Golang to generate API keys for relevant client operations.
- Deploy with [Fly.io](https://fly.io/).

#### Search

- Search cluster will be powered by [Typesense](https://typesense.org)
  - Uses [Raft algorithm](https://raft.github.io/) to maintain durability, so 3 nodes might be enough.
- Deploy across regions with [Fly.io](https://fly.io/).

##### Avoid centralized cloud providers as much as possible (AWS, GCP, Azure) in order to ensure maximum decentralization.

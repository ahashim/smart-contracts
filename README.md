# 🦔 Critter

### A peer-to-peer microblogging NFT platform for EVM-like blockchains

Given the advertising and data-mining middlemen of traditional digital content, the emerging NFT market for said content, and the crypto startups merely mimicking the same old dynamics, Critter was born.

Utilizing ownership fundamentals and financial incentives, Critter consolidates the full content pipeline – creation, virality, and reward. Through that process, it aims to empower makers to leverage the possibilities of Blockchain to forge a new, more transparent system that can serve them directly.

- [Core Concepts](#core-concepts)
- [Local Development](#local-development)
- [Testing](#testing)
- [Project Roadmap](#project-roadmap)
- [Architecture](#architecture)

## Core concepts

- Every address is a unique username.
- Every post (called a squeak) is an NFT.
- Squeaks can be bought & sold via a bidding price discovery mechanism.
- Once the author sells their squeak, the ownership is transferred to a new user.
- Actions (such as "favorites" & "resqueaks") cost a fee.
- Fees are paid out to the **owner** of said squeak (not necessarily the original author).
- Only owners can delete squeaks.
- Deleting a squeak costs a fee of `blocks elapsed x deletion fee`.

## Local Development

###### **Requirements**:

- [Node JS](https://nodejs.org) version `^14.8.2`.

###### **Optional**:

- An `.env` file in the project root with your `COINMARKETCAP_API_KEY` if you would like to see realtime currency values in the gas report:

```
COINMARKETCAP_API_KEY=<your-coinmarketcap-api-key>
```

#### Install dependencies

```bash
npm install
```

#### Compile contracts

```bash
npm run compile
```

#### `CRTTR` console

The `CRTTR` console allows local interaction with the deployed Critter contracts via a node repl:

```bash
npm run console
```

Available commands are:

- `hh`: an instance of hardhat, [including all available tasks](https://github.com/ahashim/critter/blob/main/tasks/contract.ts#L15).
- `critter`: returns the deployed contract instance & all available methods on it.
- `platformFee`: The default amount in wei required for payable transactions (like, dislike, resqueak).
- `owner`: returns the `owner` signer account instance & all available methods on it.
  - By default the owner account has all available roles granted to it:
    - `DEFAULT_ADMIN_ROLE`
    - `MINTER_ROLE`
    - `PAUSER_ROLE`
    - `TREASURER_ROLE`
    - `UPGRADER_ROLE`
  - The `owner` signer does not have a Critter account.
- `ahmed`, `barbie`, `carlos`: each returns an individual signer account instance & all available methods on it.
  - **Note:** these are all normal signers which only have `MINTER_ROLE` access, and a single Critter account associated with their address.

## Testing

#### Unit Tests

```bash
npm run test
```

You can also run the tests in watch mode which will rerun all unit-tests & generate a contract-size report whenever a file is changed within the `contracts` or `test` directories.

```bash
npm run watch
```

_*NOTE: this doesn't typecheck test files for faster performance per test run.*_

#### Test Coverage

A test coverage report can be generated by running:

```bash
npm run coverage
```

#### Contract Size

A contract-size report can be generated by running:

```bash
npm run size
```

## Project Roadmap

- [x] ERC721 interface compatability.
- [x] Create account.
- [x] Update username.
- [x] Post squeak.
- [x] Delete squeak.
- [x] Upgradeable contracts via [UUPS proxy pattern](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable).
- [x] `CRTTR` console for local contract interaction.
- [x] Platform Fees + P2P user payments.
- [x] Liking a squeak & undoing a like.
- [x] Disliking a squeak & undoing a dislike.
- [x] Resqueaking & undoing a resqueak.
- [ ] Adding `TREASURER_ROLE` functions to update platform fees & safely withdraw funds.
- [ ] Lurker incentives: early interactors of a squeak (`scouts`) will receive dividends from future likes.
  - Limit to `100` to mitigate the concentration of platform interactions around any specific set of users.
- [ ] Account funding via ERC-20 compatible tokens.
- [ ] Media support for squeaks via IPFS (images, video, documents, etc&hellip;).
  - Can use a pinning service such as [Pinata](https://www.pinata.cloud/) for writes, and [Cloudflare IPFS](https://cloudflare-ipfs.com/ipns/ipfs.io/) for reads.
- [ ] Moderation
  - Implement basic moderation status on account structs: {Active, Suspended, Banned}
  - Off-chain content reporting.
- [ ] Auction mechanism to bid on posted squeaks
  - Ideally [Vickrey auctions](https://github.com/JoWxW/Vickrey-Auction/blob/master/contracts/VickreyAuction.sol).
- [ ] Harden contract with [security best practices](https://consensys.net/blog/developers/solidity-best-practices-for-smart-contract-security/).
- [ ] Fuzz testing with [Echidna](https://github.com/crytic/echidna).
- [ ] Deploy to an EVM compatible layer 2 solution such as [zkSync](https://portal.zksync.io/).

## Architecture

#### Smart Contracts

- All smart contracts are written in Solidity & deployed to an EVM compatible Layer 2 solution.
- Deploying to [zkSync](https://portal.zksync.io/) is the current cheapest option in terms of price per transaction.
- Contracts are pausable & upgradeable in order to safely add features & fix bugs in an iterative manner.
  - Existing storage variables will always remain, and only be appended to.
  - New functionality will be added via additional contracts and/or deploying new versions of existing contract methods.

#### Indexer

- Indexer written in Golang or Node to watch on-chain event logs & create entries from them directly to a database.
  - Will send to the `fanout-service` for further data validation/sanitization.
  - Upgrade this to use a message queue after indexing (w/ built-in backpressure), which then sends data out to the `fanout-service` service when squeaks volume kicks up.
- Does not need to be highly available (one instance will suffice, and can run locally).
- Deploy with [Fly.io](https://fly.io/).

#### Database

- All user/squeak data not-stored on chain will be in the database.
- Database cluster will likely be MySql/MariaDB to optimize for reads.
  - If using Postgres instead, we can potentially use supabase's [pg_graphql](https://github.com/supabase/pg_graphql) to directly hit datbase for reads from the client.
- Using `read + write > # nodes` formula to get eventual consistency
  - Start with 3 nodes, and always keeping the # of nodes an odd number to avoid the [split-brain problem](https://www.45drives.com/community/articles/what-is-split-brain/).
- `tokenID`'s can serve as primary keys
  - `uint256` primary key type ensures we will likely not run out before the heat death of the universe.
- Deploy across regions with [Fly.io](https://fly.io/).

#### Client

- User interface written in Typescript using:
  - [Preact](https://preactjs.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
- Deploy to edge servers (probably on [Cloudflare](https://cloudflare.com)), as well as IPFS.

#### Server

- Server written in Golang.
  - Handles client/service API key generation via `auth-service`.
    - Can likely use `redis` or another in-memory k/v store to handle session keys.
  - Handles data routing from the indexer/message-queue via a `fanout-service`.
  - Local LRU cache layer for reading high volume squeaks.
- Deploy with [Fly.io](https://fly.io/).

#### Search

- Search cluster will be powered by [Typesense](https://typesense.org)
  - Uses [Raft algorithm](https://raft.github.io/) to maintain durability, so 3 nodes might be enough.
- API keys generated on a per client basis via `auth-service` to directly have clients hit search servers (with limited permissions).
- Deploy across regions with [Fly.io](https://fly.io/).

##### Avoid centralized cloud providers as much as possible (AWS, GCP, Azure) in order to ensure maximum decentralization.

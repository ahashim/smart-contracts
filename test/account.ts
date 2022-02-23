// libraries
import { expect } from "chai";
import { ethers } from "hardhat";

// types
import type { Contract, ContractFactory } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Accounts", () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  // account variables
  const username = "a-rock";

  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory("Critter");
    contract = await factory.deploy(
      "Critter", // name
      "CRTR", // symbol
      "https://critter.fyi" // baseURL
    );
  });

  it("creates an account with the senders address", async () => {
    // create account tx
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait(); // wait until it's mined

    // compare username for that address from the blockchain
    const name = await contract.getUser(owner.address);
    expect(name).to.equal(username);
  });

  it("reverts when the address is already registered", async () => {
    // first create account tx
    const firstCreateAccountTx = await contract.createAccount(username);
    await firstCreateAccountTx.wait(); // wait until it's mined

    // second create account tx from the same address
    await expect(contract.createAccount("some-other-name")).to.be.revertedWith(
      "address already registered"
    );
  });

  it("reverts when the username is already taken", async () => {
    // first create account tx
    const firstCreateAccountTx = await contract.createAccount(username);
    await firstCreateAccountTx.wait(); // wait until it's mined

    // second create account tx from a different address but duplicate username
    await expect(
      contract.connect(ahmed).createAccount(username)
    ).to.be.revertedWith("username taken");
  });

  it("reverts when the username is too short", async () => {
    await expect(contract.createAccount("")).to.be.revertedWith(
      "username cannot be empty"
    );
  });

  it("reverts when the username is too long", async () => {
    await expect(
      contract.createAccount("000000000000000000000000000000001")
    ).to.be.revertedWith("username is too long");
  });
});

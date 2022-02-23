// libraries
import { expect } from "chai";
import { ethers } from "hardhat";

// types
import type { Contract, ContractFactory } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Accounts", () => {
  let ahmed: SignerWithAddress;
  let contract: Contract;
  let factory: ContractFactory;

  beforeEach(async () => {
    // ignoring the first owner account in order to test posting by regular user accounts
    [, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory("Critter", ahmed);
    contract = await factory.deploy("Critter", "CRTR", "https://critter.fyi");
  });

  it("creates an account with the senders address", async () => {
    // create account tx
    const username = "a-rock";
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait(); // wait until it's mined

    // get user from blockchain
    const name = await contract.getUser(ahmed.address);
    expect(name).to.equal(username);
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

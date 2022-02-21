// libraries
import { expect } from "chai";
import { ethers } from "hardhat";

// types
import type { Contract, ContractFactory } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Squeaks", function () {
  let factory: ContractFactory;
  let critter: Contract;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    factory = await ethers.getContractFactory("Critter");
    [owner] = await ethers.getSigners();
    critter = await factory.deploy();
  });

  it("lets a user post a squeak", async function () {
    // create the transaction to post a squeak
    const postContent = "hello blockchain!";
    const postSqueakTx = await critter.postSqueak(postContent);

    // wait until the transaction is mined
    await postSqueakTx.wait();
    const nonce = await critter.getNonce();
    const squeak = await critter.getSqueak(nonce);

    expect(nonce).to.equal(1);
    expect(squeak.content).to.equal(postContent);
    expect(squeak.account).to.equal(owner.address);
  });
});

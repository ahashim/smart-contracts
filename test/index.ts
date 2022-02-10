import { expect } from "chai";
import { ethers } from "hardhat";

describe("Critter", function () {
  it("Should post a squeak", async function () {
    const [owner] = await ethers.getSigners();
    const Critter = await ethers.getContractFactory("Critter");
    const critter = await Critter.deploy();
    await critter.deployed();

    const postContent = "hello blockchain!";
    const postSqueakTx = await critter.postSqueak(postContent);

    // wait until the transaction is mined
    await postSqueakTx.wait();
    const nonce = await critter.getNonce();
    const squeak = await critter.getSqueak(nonce);

    expect(nonce).to.equal(1);
    expect(squeak.content).to.equal(postContent);
    expect(squeak.account).to.equal(owner.address);

    console.log(postSqueakTx);
  });
});

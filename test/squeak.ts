// libraries
import { expect } from "chai";
import { ethers } from "hardhat";

// types
import type { Contract, ContractFactory } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe.skip("Squeaks", () => {
  let ahmed: SignerWithAddress;
  let contract: Contract;
  let factory: ContractFactory;

  beforeEach(async () => {
    // ignoring the first owner account in order to test posting by regular user accounts
    [, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory("Critter");
    contract = await factory.deploy();
  });

  it("posts a squeak from the senders address", async () => {
    // create the transaction to post a squeak
    const content = "hello blockchain!";
    const postSqueakTx = await contract.connect(ahmed).postSqueak(content);

    // wait until it's mined
    await postSqueakTx.wait();
    const nonce = await contract.getNonce();
    const squeak = await contract.getSqueak(nonce);

    // assertions
    expect(squeak.content).to.equal(content);
    expect(squeak.account).to.equal(ahmed.address);
  });

  it("does not post an empty squeak", async () => {
    const emptySqueak = "";

    // assertions
    await expect(contract.postSqueak(emptySqueak)).to.be.revertedWith(
      "Squeak cannot be empty"
    );
  });

  it("does not post a squeak that's too long", async () => {
    const longSqueak = `Did you ever hear the tragedy of Darth Plagueis The Wise?
      I thought not. It’s not a story the Jedi would tell you. It’s a Sith legend.
      Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise he could
      use the Force to influence the midichlorians to create life...`;

    // assertions
    await expect(contract.postSqueak(longSqueak)).to.be.revertedWith(
      "Squeak length is over the limit"
    );
  });
});
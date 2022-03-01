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

  // bytes32 role identifiers
  const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");

  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory("Critter");
    contract = await factory.deploy(
      "Critter", // name
      "CRTR", // symbol
      "https://critter.fyi/token/" // baseURL
    );
  });

  it("creates an account with the senders address", async () => {
    // create account tx
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait(); // wait until it's mined

    // compare username for that address from the blockchain
    const name = await contract.getUsername(owner.address);
    expect(name).to.equal(username);
  });

  it("reverts when the address is already registered", async () => {
    // first create account tx
    const firstCreateAccountTx = await contract.createAccount(username);
    await firstCreateAccountTx.wait(); // wait until it's mined

    // second create account tx from the same address
    await expect(contract.createAccount("some-other-name")).to.be.revertedWith(
      "Critter: address already registered"
    );
  });

  it("grants every account the role of MINTER", async () => {
    // contract owner
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait(); // wait until it's mined

    // another account
    const anotherCreateAccountTx = await contract
      .connect(ahmed)
      .createAccount("ahmed");
    await anotherCreateAccountTx.wait(); // wait until it's mined

    // assert 2 accounts have the role of minter
    expect(await contract.getRoleMemberCount(MINTER_ROLE)).to.equal(2);

    // first account belongs to the owner
    expect(await contract.getRoleMember(MINTER_ROLE, 0)).to.equal(
      owner.address
    );

    // second is a regular user
    expect(await contract.getRoleMember(MINTER_ROLE, 1)).to.equal(
      ahmed.address
    );
  });

  it("updates the username", async () => {
    // create account
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait(); // wait until it's mined

    // assert we have a username
    expect(await contract.getUsername(owner.address)).to.equal(username);

    // change username
    const newUsername = "ahashim";
    const changeUsernameTx = await contract.updateUsername(newUsername);
    await changeUsernameTx.wait();

    // assert our username changed
    expect(await contract.getUsername(owner.address)).to.equal(newUsername);
  });

  it("makes an old username available when updating to a new one", async () => {
    // contract owner is regisetering as 'a-rock'
    const createAccountTx = await contract.createAccount(username);
    await createAccountTx.wait();

    // contract owner updates their username to 'ahashim'
    const updateUsernameTx = await contract.updateUsername("ahashim");
    await updateUsernameTx.wait();

    // another account can now register as 'a-rock'
    const anotherCreateAccountTx = await contract
      .connect(ahmed)
      .createAccount(username);
    await anotherCreateAccountTx.wait();

    // assert our new account has the original username
    expect(await contract.getUsername(ahmed.address)).to.equal(username);
  });

  it("reverts when updating username & the address is not registered", async () => {
    // second create account tx from a different address but duplicate username
    await expect(
      contract.connect(ahmed).updateUsername("ahmed")
    ).to.be.revertedWith("Critter: address not registered");
  });

  it("reverts when updating username & new the username is already taken", async () => {
    // first create account tx
    const firstCreateAccountTx = await contract.createAccount(username);
    await firstCreateAccountTx.wait(); // wait until it's mined

    // second create account tx from a different address but duplicate username
    await expect(
      contract.connect(ahmed).createAccount(username)
    ).to.be.revertedWith("Critter: username taken");
  });

  it("reverts when updating the username & the new username is empty", async () => {
    await expect(contract.createAccount("")).to.be.revertedWith(
      "Critter: username cannot be empty"
    );
  });

  it("reverts when updating the username & the new username is longer than 256 bytes", async () => {
    await expect(
      contract.createAccount("000000000000000000000000000000001")
    ).to.be.revertedWith("Critter: username is too long");
  });
});

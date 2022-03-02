// libraries
import { expect } from 'chai';
import { ethers } from 'hardhat';

// types
import type { Contract, ContractFactory } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Squeaks', () => {
  // contract
  let contract: Contract;
  let factory: ContractFactory;

  // users
  let owner: SignerWithAddress;
  let ahmed: SignerWithAddress;

  beforeEach(async () => {
    [owner, ahmed] = await ethers.getSigners();
    factory = await ethers.getContractFactory('Critter');

    // deploy our contract
    contract = await factory.deploy(
      'Critter', // name
      'CRTR', // symbol
      'https://critter.fyi/token/' // baseURL
    );

    // create an account
    const createAccountTx = await contract.createAccount('a-rock');
    await createAccountTx.wait();
  });

  it('posts a squeak from the senders address', async () => {
    const content = 'hello blockchain!';

    // post a squeak
    const createSqueakTx = await contract.createSqueak(content);
    await createSqueakTx.wait();

    // retrieve it based on its id
    const squeak = await contract.getSqueak(1);

    // assertions
    expect(squeak.content).to.equal(content);
    expect(squeak.account).to.equal(owner.address);
  });

  it('does not allow a user to post without a registered address', async () => {
    // assertions
    await expect(
      // trying to create a squeak from ahmed's account who never registered
      contract.connect(ahmed).createSqueak('hello blockchain!')
    ).to.be.revertedWith('Critter: address not registered');
  });

  it('does not post an empty squeak', async () => {
    const emptySqueak = '';

    // assertions
    await expect(contract.createSqueak(emptySqueak)).to.be.revertedWith('Critter: squeak cannot be empty');
  });

  it("does not post a squeak that's too long", async () => {
    const longSqueak = `Did you ever hear the tragedy of Darth Plagueis The Wise?
      I thought not. It’s not a story the Jedi would tell you. It’s a Sith legend.
      Darth Plagueis was a Dark Lord of the Sith, so powerful and so wise he could
      use the Force to influence the midichlorians to create life...`;

    // assertions
    await expect(contract.createSqueak(longSqueak)).to.be.revertedWith('Critter: squeak is too long');
  });
});

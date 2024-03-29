import { task } from 'hardhat/config';

import { Configuration, Interaction } from '../enums';
import type {
  BigNumber,
  Contract,
  ContractReceipt,
  ContractTransaction,
  Critter,
  Event,
  Result,
  SignerWithAddress,
  Squeakable,
} from '../types';

task(
  'create-accounts',
  'Create accounts from Signers',
  async ({
    accounts,
    contract,
  }: {
    contract: Contract;
    accounts: SignerWithAddress[];
  }): Promise<void> => {
    accounts.forEach(async (account, index) => {
      await contract
        .connect(account)
        .createAccount('account_' + index.toString());
    });
  }
);

task(
  'create-squeak',
  'Create a squeak',
  async ({
    content,
    contract,
    signer,
  }: {
    contract: Contract;
    signer: SignerWithAddress;
    content: string;
  }): Promise<{
    receipt: ContractReceipt;
    squeakId: BigNumber;
    tx: ContractTransaction;
  }> => {
    // create squeak tx
    const tx: ContractTransaction = await contract
      .connect(signer)
      .createSqueak(content);

    // wait for confirmation
    const receipt: ContractReceipt = await tx.wait();

    // parse event data for the tokenId
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    const { tokenId: squeakId } = event!.args as Result;

    return { receipt, squeakId, tx };
  }
);

task(
  'delete-squeak',
  'Delete a squeak',
  async (
    {
      contracts,
      signer,
      squeakId,
    }: {
      contracts: {
        critter: Critter;
        squeakable: Squeakable;
      };
      signer: SignerWithAddress;
      squeakId: BigNumber;
    },
    { ethers }
  ): Promise<{
    deleteFee: BigNumber;
    tx: ContractTransaction;
  }> => {
    // connect signer
    let { critter, squeakable } = contracts;
    critter = critter.connect(signer);

    // get the block the squeak was authored in
    const blockAuthored: BigNumber = (await squeakable.squeaks(squeakId))
      .blockNumber;

    // delete the squeak by paying the quoted delete fee
    const tx: ContractTransaction = await critter.deleteSqueak(squeakId, {
      value: await critter.getDeleteFee(squeakId),
    });

    // get the actual cost of deleting the squeak without the quoted buffer
    const deleteFee = ethers.BigNumber.from((await tx.wait()).blockNumber)
      .sub(blockAuthored)
      .mul(await critter.config(Configuration.DeleteRate));

    return { deleteFee, tx };
  }
);

task(
  'interact',
  'Interact with a squeak',
  async ({
    contract,
    interaction,
    signer,
    squeakId,
  }: {
    contract: Contract;
    interaction: Interaction;
    signer: SignerWithAddress;
    squeakId: BigNumber;
  }): Promise<ContractTransaction> => {
    return await contract.connect(signer).interact(squeakId, interaction, {
      value: await contract.fees(interaction),
    });
  }
);

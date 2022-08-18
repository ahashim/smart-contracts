import { task } from 'hardhat/config';
import {
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
} from '../constants';
import { Interaction } from '../enums';

// types
import type {
  BigNumber,
  Contract,
  ContractFactory,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Critter } from '../typechain-types/contracts';
import type { Result } from '@ethersproject/abi';
import type { ContractInitializerOverrides } from '../types';

// tasks
task(
  'create-accounts',
  'Create accounts from Wallets',
  async ({
    accounts,
    contract,
  }: {
    contract: Contract;
    accounts: Wallet[];
  }): Promise<void> => {
    accounts.forEach(async (account, index) => {
      await contract.connect(account).createAccount(index.toString());
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
      contract,
      signer,
      squeakId,
    }: {
      contract: Contract;
      signer: SignerWithAddress;
      squeakId: BigNumber;
    },
    { ethers }
  ): Promise<{
    deleteFee: BigNumber;
    tx: ContractTransaction;
  }> => {
    // connect signer
    contract = contract.connect(signer);

    // get the block the squeak was authored in
    const blockAuthored: BigNumber = (await contract.squeaks(squeakId))
      .blockNumber;

    // delete the squeak by paying the quoted delete fee
    const tx: ContractTransaction = await contract.deleteSqueak(squeakId, {
      value: await contract.getDeleteFee(squeakId),
    });

    // get the actual cost of deleting the squeak without the quoted buffer
    const deleteFee = ethers.BigNumber.from((await tx.wait()).blockNumber)
      .sub(blockAuthored)
      .mul(await contract.fees(Interaction.Delete));

    return { deleteFee, tx };
  }
);

task(
  'deploy-contract',
  'Deploys contracts via an upgradeable proxy from the owner EOA',
  async (
    overrides: ContractInitializerOverrides,
    { ethers, upgrades }
  ): Promise<Critter> => {
    const contractInitializer: (string | number | BigNumber)[] = [];
    const defaults = {
      name: {
        value: CONTRACT_NAME,
        position: 0,
      },
      symbol: {
        value: CONTRACT_SYMBOL,
        position: 1,
      },
      baseTokenURI: {
        value: BASE_TOKEN_URI,
        position: 2,
      },
      platformFee: {
        value: PLATFORM_FEE,
        position: 3,
      },
      takeRate: {
        value: PLATFORM_TAKE_RATE,
        position: 4,
      },
      scoutPoolThreshold: {
        value: SCOUT_POOL_THRESHOLD,
        position: 5,
      },
      viralityThreshold: {
        value: VIRALITY_THRESHOLD,
        position: 6,
      },
      scoutBonus: {
        value: SCOUT_BONUS,
        position: 7,
      },
      scoutMaxLevel: {
        value: SCOUT_MAX_LEVEL,
        position: 8,
      },
    };

    // check for overrides
    if (Object.keys(overrides || {}).length) {
      for (const key in overrides) {
        defaults[key].value =
          overrides[key as keyof ContractInitializerOverrides];
      }
    }

    // build contract constructor
    for (const key in defaults) {
      contractInitializer[defaults[key].position] = defaults[key].value;
    }

    // get contract factory instance
    const factory: ContractFactory = await ethers.getContractFactory(
      defaults.name.value
    );

    // deploy contract via upgradeable proxy
    return (await upgrades.deployProxy(
      factory,
      contractInitializer
    )) as Critter;
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
  }): Promise<void> => {
    await contract.connect(signer).interact(squeakId, interaction, {
      value: await contract.fees(interaction),
    });
  }
);

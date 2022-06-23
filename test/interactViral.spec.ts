import { expect } from 'chai';
import { ethers, upgrades, waffle } from 'hardhat';
import {
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  INTERACTION,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
} from '../constants';

// types
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Event,
  Wallet,
} from 'ethers';
import type { Result } from '@ethersproject/abi';
import type { Critter } from '../typechain-types/contracts';

describe('interact viral', () => {
  let critter: Critter;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let owner: Wallet,
    ahmed: Wallet,
    barbie: Wallet,
    carlos: Wallet,
    daphne: Wallet;
  let ahmedBalance: BigNumber, squeakId: BigNumber, treasuryBalance: BigNumber;
  let fees: {
    [name: string]: BigNumber;
  };
  let treasuryTake: number, transferAmount: number;

  // test variables
  const scoutPoolThreshold = ethers.utils.parseEther('0.000002');
  const viralityThreshold = 60;

  before('create fixture loader', async () => {
    [owner, ahmed, barbie, carlos, daphne] = await (
      ethers as any
    ).getSigners();
    loadFixture = waffle.createFixtureLoader([
      owner,
      ahmed,
      barbie,
      carlos,
      daphne,
    ]);
  });

  const interactViralFixture = async () => {
    // deploy contract with a lower virality & scout pool threshold for testing
    const factory = await ethers.getContractFactory(CONTRACT_NAME);
    critter = (
      await upgrades.deployProxy(factory, [
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        BASE_TOKEN_URI,
        PLATFORM_FEE,
        PLATFORM_TAKE_RATE,
        scoutPoolThreshold,
        viralityThreshold,
        SCOUT_BONUS,
        SCOUT_MAX_LEVEL,
      ])
    ).connect(ahmed) as Critter;

    // creates accounts
    [ahmed, barbie, carlos, daphne].forEach(async (account, index) => {
      await critter.connect(account).createAccount(index.toString());
    });

    // get interaction fees
    fees = {
      dislike: await critter.getInteractionFee(INTERACTION.Dislike),
      like: await critter.getInteractionFee(INTERACTION.Like),
      resqueak: await critter.getInteractionFee(INTERACTION.Resqueak),
    };

    // determine treasury take & transfer amount based on like interaction fee
    treasuryTake = (fees.like.toNumber() * PLATFORM_TAKE_RATE) / 100;
    transferAmount = (fees.like.toNumber() - treasuryTake) / 2;

    // ahmed posts a squeak
    // current virality score: 0
    const tx = (await critter.createSqueak(
      'hello blockchain!'
    )) as ContractTransaction;
    const receipt = (await tx.wait()) as ContractReceipt;
    const event = receipt.events!.find(
      (event: Event) => event.event === 'SqueakCreated'
    );
    ({ tokenId: squeakId } = event!.args as Result);

    // ahmed & barbie resqueak it
    // current virality score: 0
    [ahmed, barbie].forEach(async (account) => {
      await critter
        .connect(account)
        .interact(squeakId, INTERACTION.Resqueak, { value: fees.resqueak });
    });

    // carlos likes it, and thus makes it eligible for virality
    // current virality score: 58
    await critter
      .connect(carlos)
      .interact(squeakId, INTERACTION.Like, { value: fees.like });

    // take a snaphshot of ahmeds & treasury balances before squeak goes viral
    ahmedBalance = await ahmed.getBalance();
    treasuryBalance = await critter.treasury();

    // daphne likes it, and brings the score past the virality threshold
    // current virality score: 63
    await critter
      .connect(daphne)
      .interact(squeakId, INTERACTION.Like, { value: fees.like });

    return {
      critter,
      fees,
      squeakId,
      transferAmount,
      treasuryTake,
    };
  };

  beforeEach('deploy test contract, and create a viral squeak', async () => {
    ({ critter, fees, squeakId, transferAmount, treasuryTake } =
      await loadFixture(interactViralFixture));
  });

  it('marks the squeak as viral', async () => {
    // virality score is greater than the threshold
    expect(
      (await critter.getViralityScore(squeakId)).toNumber()
    ).to.be.greaterThan(viralityThreshold);

    // squeak is marked viral
    expect(await critter.isViral(squeakId)).to.be.true;
  });

  it('increases all positive interactors level by one', async () => {
    // everybody who either liked or resqueaked the viral squeak, but did not
    // propel the squeak into virality
    const interactors = [ahmed, barbie, carlos];

    interactors.forEach(async (account) => {
      expect((await critter.users(account.address)).scoutLevel).to.eq(2);
    });
  });

  it('increases the scout level of the viral-propeller by an extra amount', async () => {
    // all accounts start off at level 1
    const initialScoutLevel = 1;

    // daphne positively interacted with the squeak, so they get a default
    // increase of 1 scout level when the squeak goes viral (along with the
    // other positive interactors)
    const basicScoutIncrease = 1;

    // daphne is also the person that propelled the squeak into virality (in
    // addition to being a positive interactor), so the additional scout bonus
    // is applied to their account
    expect((await critter.users(daphne.address)).scoutLevel).to.equal(
      initialScoutLevel + basicScoutIncrease + SCOUT_BONUS
    );
  });

  it('adds all positive interactors to the scout pool', async () => {
    // everybody who either liked or resqueaked the viral squeak
    const interactors = [ahmed, barbie, carlos, daphne];
    const scouts = await critter.getScouts(squeakId);

    interactors.forEach((account) => {
      expect(scouts.includes(account.address)).to.be.true;
    });
  });

  it('sums the scout levels of all positive interactors as the pool level total', async () => {
    // 3 scouts at level 2 + 1 scout at level 5
    const expectedLevelTotal = 2 * 3 + 5;

    expect((await critter.getScoutPool(squeakId)).shares).to.eq(
      expectedLevelTotal
    );
  });

  it('deposits the take for the viral interaction into the treasury', async () => {
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      treasuryTake
    );
  });

  it('deposits half of the platform fee into the scout pool', async () => {
    expect((await critter.getScoutPool(squeakId)).amount).to.eq(
      transferAmount
    );
  });

  it('deposits half of the platform fee into squeak owners wallet', async () => {
    expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(transferAmount);
  });

  it('deposits the full fee into the treasury for negative interactions', async () => {
    const treasuryBalance = await critter.treasury();

    await critter
      .connect(barbie)
      .interact(squeakId, INTERACTION.Dislike, { value: fees.dislike });

    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      fees.dislike
    );
  });

  it('pays out scout funds to members of the pool when it hits the threshold', async () => {
    // get starting balance of interactors before pool payout
    const ahmedBalance = await ahmed.getBalance();
    const carlosBalance = await carlos.getBalance();
    const daphneBalance = await daphne.getBalance();

    // get treasury balance before pool payout
    const treasuryBalance = await critter.treasury();

    // get pool unit for expected amount after the interaction
    const pool = await critter.getScoutPool(squeakId);
    const sharePrice = pool.amount.add(transferAmount).div(pool.shares);

    // barbie likes the viral squeak bringing the pool unit past its threshold
    await critter.connect(barbie).interact(squeakId, INTERACTION.Like, {
      value: fees.like,
    });

    // TODO: Barbie's balance after the interaction is lower than what they
    // started off with due to the platform & gas fees on the unbounded loop
    // (making it impractical to test). Fix this in future versions by moving
    // the payout loop off-chain, and replacing it with an O(1) bitmap.

    // pool members are paid based on their scout level
    expect((await carlos.getBalance()).sub(carlosBalance)).to.eq(
      sharePrice.mul((await critter.users(carlos.address)).scoutLevel)
    );
    expect((await daphne.getBalance()).sub(daphneBalance)).to.eq(
      sharePrice.mul((await critter.users(daphne.address)).scoutLevel)
    );

    // squeak owner gets transferAmount in addition to pool payout
    expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(
      sharePrice
        .mul((await critter.users(ahmed.address)).scoutLevel)
        .add(transferAmount)
    );

    // remaining dust is deposited into the treasury (8 wei in this case)
    expect(
      (await critter.treasury()).sub(treasuryBalance.add(treasuryTake))
    ).to.eq(7);

    // pool amount is reset
    expect((await critter.getScoutPool(squeakId)).amount).to.eq(0);
  });
});

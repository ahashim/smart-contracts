import { BONUS, PLATFORM_TAKE_RATE } from '../constants';
import { Interaction } from '../enums';
import type {
  BigNumber,
  BigNumberObject,
  Critter,
  PoolInfo,
  PoolPassInfo,
  SignerWithAddress,
} from '../types';
import { ethers, expect, loadFixture, run } from './setup';

describe('interact viral', () => {
  let ahmed: SignerWithAddress,
    ahmedBalance: BigNumber,
    balances: BigNumberObject,
    barbie: SignerWithAddress,
    carlos: SignerWithAddress,
    critter: Critter,
    daphne: SignerWithAddress,
    fees: BigNumberObject,
    poolInfo: PoolInfo,
    squeakId: BigNumber,
    transferAmount: BigNumber,
    treasuryBalance: BigNumber,
    treasuryTake: BigNumber;

  // test variables
  const viralityThreshold = 60;

  const interactViralFixture = async () => {
    [, ahmed, barbie, carlos, daphne] = await ethers.getSigners();
    // deploy contract with a lower virality threshold
    critter = (
      await run('deploy-contract', {
        PoolThreshold: ethers.utils.parseEther('0.000004'),
        viralityThreshold,
      })
    ).connect(ahmed);

    // creates accounts
    await run('create-accounts', {
      accounts: [ahmed, barbie, carlos, daphne],
      contract: critter,
    });

    // get interaction fees
    fees = {
      dislike: await critter.fees(Interaction.Dislike),
      like: await critter.fees(Interaction.Like),
      resqueak: await critter.fees(Interaction.Resqueak),
    };

    // determine treasury take & transfer amount based on like interaction fee
    treasuryTake = fees.like.mul(PLATFORM_TAKE_RATE).div(100);
    transferAmount = fees.like.sub(treasuryTake).div(2);

    // ahmed posts a squeak
    // current virality score: 0
    ({ squeakId } = await run('create-squeak', {
      content: 'hello blockchain!',
      contract: critter,
      signer: ahmed,
    }));

    // ahmed & barbie resqueak it
    // current virality score: 0
    [ahmed, barbie].forEach(async (signer) => {
      await critter
        .connect(signer)
        .interact(squeakId, Interaction.Resqueak, { value: fees.resqueak });
    });

    // carlos likes it, and thus makes it eligible for virality
    // current virality score: 58
    await critter
      .connect(carlos)
      .interact(squeakId, Interaction.Like, { value: fees.like });

    // take a snaphshot of ahmeds & treasury balances before squeak goes viral
    ahmedBalance = await ahmed.getBalance();
    treasuryBalance = await critter.treasury();

    // daphne likes it, and brings the score past the virality threshold
    // current virality score: 63
    await critter
      .connect(daphne)
      .interact(squeakId, Interaction.Like, { value: fees.like });

    return {
      balances: {
        ahmed: ahmedBalance,
        carlos: await carlos.getBalance(),
        daphne: await daphne.getBalance(),
        treasury: treasuryBalance,
      },
      critter,
      fees,
      poolInfo: await critter.getPoolInfo(squeakId),
      squeakId,
      transferAmount,
      treasuryTake,
    };
  };

  beforeEach(
    'load deployed contract fixture, and create a viral squeak',
    async () => {
      ({
        balances,
        critter,
        fees,
        poolInfo,
        squeakId,
        transferAmount,
        treasuryTake,
      } = await loadFixture(interactViralFixture));
    }
  );

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
      expect((await critter.users(account.address)).level).to.eq(2);
    });
  });

  it('increases the user level of the viral-propeller by an extra amount', async () => {
    // all accounts start off at level 1
    const initialLevel = 1;

    // daphne positively interacted with the squeak, so they get a default level
    // increase of 1 when the squeak goes viral (along with the other positive
    // interactors)
    const basicLevelIncrease = 1;

    // daphne is also the person that propelled the squeak into virality (in
    // addition to being a positive interactor), so the additional level bonus
    // is applied to their account
    expect((await critter.users(daphne.address)).level).to.equal(
      initialLevel + basicLevelIncrease + BONUS
    );
  });

  it('adds all positive interactors to the pool', async () => {
    // everybody who either liked or resqueaked the viral squeak
    const interactors = [ahmed, barbie, carlos, daphne];
    const passes = (await critter.getPoolPasses(squeakId)).map(
      (p: PoolPassInfo) => p.account
    );

    interactors.forEach((account) => {
      expect(passes.includes(account.address)).to.be.true;
    });
  });

  it('sums the levels of all positive interactors as the pool level total', async () => {
    // 3 users at level 2 + 1 user at level 5
    const expectedShares = 2 * 3 + 5;
    const [, shares] = await critter.getPoolInfo(squeakId);

    expect(shares).to.eq(expectedShares);
  });

  it('deposits the take for the viral interaction into the treasury', async () => {
    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      treasuryTake
    );
  });

  it('deposits part of the interaction fee into the pool', () => {
    expect(poolInfo.amount).to.eq(transferAmount);
  });

  it('deposits half of the platform fee into squeak owners wallet', async () => {
    expect((await ahmed.getBalance()).sub(ahmedBalance)).to.eq(transferAmount);
  });

  it('deposits the full fee into the treasury for negative interactions', async () => {
    const treasuryBalance = await critter.treasury();

    await critter
      .connect(barbie)
      .interact(squeakId, Interaction.Dislike, { value: fees.dislike });

    expect((await critter.treasury()).sub(treasuryBalance)).to.eq(
      fees.dislike
    );
  });

  it('pays out funds to users in the pool when it hits the threshold', async () => {
    // update ahmeds & treasury balances to after the squeak went viral & before
    // the pool payout interaction
    balances.ahmed = await ahmed.getBalance();
    balances.treasury = await critter.treasury();

    // get pool unit for expected amount after the interaction
    const sharePrice = poolInfo.amount
      .add(transferAmount)
      .div(poolInfo.shares);

    // barbie likes the viral squeak bringing the pool unit past its threshold
    await critter.connect(barbie).interact(squeakId, Interaction.Like, {
      value: fees.like,
    });

    // TODO: Barbie's balance after the interaction is lower than what they
    // started off with due to the platform & gas fees on the unbounded loop
    // (making it impractical to test). Fix this in future versions by moving
    // the payout loop off-chain, and replacing it with an O(1) bitmap.

    // users are paid based on their level
    expect((await carlos.getBalance()).sub(balances.carlos)).to.eq(
      sharePrice.mul((await critter.users(carlos.address)).level)
    );
    expect((await daphne.getBalance()).sub(balances.daphne)).to.eq(
      sharePrice.mul((await critter.users(daphne.address)).level)
    );

    // squeak owner gets transferAmount in addition to pool payout
    expect((await ahmed.getBalance()).sub(balances.ahmed)).to.eq(
      sharePrice
        .mul((await critter.users(ahmed.address)).level)
        .add(transferAmount)
    );
  });
});

import { expect, loadFixture, run } from './setup';
import {
  PLATFORM_TAKE_RATE,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
  SCOUT_POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
} from '../constants';
import { Configuration } from '../enums';
import type { Critter, Config } from '../types';

describe('config', () => {
  let config: Config, critter: Critter;

  const configFixture = async () => {
    critter = await run('deploy-contract');

    return {
      config: {
        platformTakeRate: await critter.config(Configuration.PlatformTakeRate),
        poolPayoutThreshold: await critter.config(
          Configuration.PoolPayoutThreshold
        ),
        scoutMaxLevel: await critter.config(Configuration.ScoutMaxLevel),
        scoutViralityBonus: await critter.config(
          Configuration.ScoutViralityBonus
        ),
        viralityThreshold: await critter.config(
          Configuration.ViralityThreshold
        ),
      },
      critter,
    };
  };

  beforeEach('load deployed contract fixture', async () => {
    ({ config, critter } = await loadFixture(configFixture));
  });

  it('gets the platform take rate for interactions', async () => {
    expect(config.platformTakeRate).to.eq(PLATFORM_TAKE_RATE);
  });

  it('gets the scout pool payout threshold', async () => {
    expect(config.poolPayoutThreshold).to.eq(SCOUT_POOL_THRESHOLD);
  });

  it('gets the max level a scout can reach', async () => {
    expect(config.scoutMaxLevel).to.eq(SCOUT_MAX_LEVEL);
  });

  it('gets the bonus level increase a scout receives for propelling a squeak into virality', async () => {
    expect(config.scoutViralityBonus).to.eq(SCOUT_BONUS);
  });

  it('gets the virality threshold for a squeak', async () => {
    expect(config.viralityThreshold).to.eq(VIRALITY_THRESHOLD);
  });
});

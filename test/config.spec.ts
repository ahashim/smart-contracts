import {
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_BONUS,
  SCOUT_MAX_LEVEL,
  SCOUT_POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
} from '../constants';
import { Configuration } from '../enums';
import type { Config, Critter } from '../types';
import { expect, loadFixture, run } from './setup';

describe('config', () => {
  let config: Config, critter: Critter;

  const configFixture = async () => {
    critter = await run('deploy-contract');

    return {
      config: {
        deleteRate: await critter.config(Configuration.DeleteRate),
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

  it('gets the squeak delete rate', () => {
    expect(config.deleteRate).to.eq(PLATFORM_FEE);
  });

  it('gets the platform take rate for interactions', () => {
    expect(config.platformTakeRate).to.eq(PLATFORM_TAKE_RATE);
  });

  it('gets the scout pool payout threshold', () => {
    expect(config.poolPayoutThreshold).to.eq(SCOUT_POOL_THRESHOLD);
  });

  it('gets the max level a scout can reach', () => {
    expect(config.scoutMaxLevel).to.eq(SCOUT_MAX_LEVEL);
  });

  it('gets the bonus level increase a scout receives for propelling a squeak into virality', () => {
    expect(config.scoutViralityBonus).to.eq(SCOUT_BONUS);
  });

  it('gets the virality threshold for a squeak', () => {
    expect(config.viralityThreshold).to.eq(VIRALITY_THRESHOLD);
  });
});

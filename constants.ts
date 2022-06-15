import { utils } from 'ethers';

// contract
export const BASE_TOKEN_URI = 'https://critter.fyi/token/';
export const CONTRACT_NAME = 'Critter';
export const CONTRACT_SYMBOL = 'CRTTR';

// role ID's
export const MINTER_ROLE = 'MINTER_ROLE';
export const PAUSER_ROLE = 'PAUSER_ROLE';
export const TREASURER_ROLE = 'TREASURER_ROLE';
export const UPGRADER_ROLE = 'UPGRADER_ROLE';

// fees (in wei)
export const PLATFORM_FEE = 33_927_831_361_389; // ~10 cents USD
export const PLATFORM_TAKE_RATE = 20; // "my 2 ¢…"

// scouts
export const SCOUT_BONUS = 3;

// thresholds
export const CONFIRMATION_THRESHOLD = 6;
export const SCOUT_POOL_THRESHOLD = utils.parseEther('0.1');
export const VIRALITY_THRESHOLD = 95;

// interactions
export const enum INTERACTION {
  Dislike,
  Like,
  Resqueak,
  UndoDislike,
  UndoLike,
  UndoResqueak,
}

// initializer
export const CONTRACT_INITIALIZER = [
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  SCOUT_POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
  SCOUT_BONUS,
];

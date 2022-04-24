// network
export const BLOCK_CONFIRMATION_THRESHOLD = 6;

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
export const PLATFORM_CHARGE = 33_927_831_361_389; // ~10 cents USD
export const PLATFORM_FEE_PERCENTAGE = 20; // "my 2 ¢…"

// init
export const CONTRACT_INITIALIZER = [
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  PLATFORM_CHARGE,
  PLATFORM_FEE_PERCENTAGE,
];

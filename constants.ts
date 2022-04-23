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
export const FEE_DELETION = 3_228_041_806_953; // about a penny per block

// init
export const CONTRACT_INITIALIZER = [
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_TOKEN_URI,
  FEE_DELETION,
];

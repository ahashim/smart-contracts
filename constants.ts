// network
export const HARDHAT_NETWORK_ID = 31337;
export const BLOCK_CONFIRMATION_THRESHOLD = 6;

// account
export const USERNAME = 'a-rock';

// contract
export const BASE_TOKEN_URI = 'https://critter.fyi/token/';
export const CONTRACT_NAME = 'Critter';
export const SYMBOL = 'CRTTR';

// fees (in wei)
export const FEE_DELETION = 3_228_041_806_953; // about a penny per block

// init
export const CONTRACT_INITIALIZER = [
  CONTRACT_NAME,
  SYMBOL,
  BASE_TOKEN_URI,
  FEE_DELETION,
];

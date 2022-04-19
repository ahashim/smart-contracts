// network
export const HARDHAT_NETWORK_ID = 31337;

// account
export const USERNAME = 'a-rock';

// contract
export const BASE_TOKEN_URI = 'https://critter.fyi/token/';
export const CONTRACT_NAME = 'Critter';
export const SYMBOL = 'CRTTR';

// fees (in wei)
export const FEE_REGISTRATION = 3_400_000_000_000_000; // currently about $10
export const FEE_DELETION = 3_228_041_806_953; // about a penny per block

// init
export const CONTRACT_INITIALIZER = [
  CONTRACT_NAME,
  SYMBOL,
  BASE_TOKEN_URI,
  FEE_REGISTRATION,
  FEE_DELETION,
];

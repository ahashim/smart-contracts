import { BigNumber, constants, utils } from 'ethers';

// contract
export const BASE_TOKEN_URI = 'https://critter.fyi/token/';
export const CONTRACT_NAME = 'Critter';
export const CONTRACT_SYMBOL = 'CRTTR';

// fees (in wei)
export const PLATFORM_FEE = utils.parseEther('0.00008');
export const PLATFORM_TAKE_RATE = 10;

// role ID's
export const OPERATOR_ROLE = utils.id('OPERATOR_ROLE');
export const MINTER_ROLE = utils.id('MINTER_ROLE');
export const MODERATOR_ROLE = utils.id('MODERATOR_ROLE');
export const TREASURER_ROLE = utils.id('TREASURER_ROLE');
export const UPGRADER_ROLE = utils.id('UPGRADER_ROLE');

// levels
export const BONUS = 3;
export const MAX_LEVEL = 50;

// thresholds
export const POOL_THRESHOLD = utils.parseEther('0.1');
export const VIRALITY_THRESHOLD = 95;

// initializer
export const CONTRACT_INITIALIZER = [
  PLATFORM_FEE,
  PLATFORM_TAKE_RATE,
  POOL_THRESHOLD,
  VIRALITY_THRESHOLD,
  BONUS,
  MAX_LEVEL,
];

// test variables
export const EMPTY_BYTE_STRING = utils.hexlify(utils.toUtf8Bytes(''));
export const OVERFLOW = constants.MaxUint256.add(BigNumber.from(1));

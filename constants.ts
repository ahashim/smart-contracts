import { BigNumber, constants, utils } from 'ethers';

// contract
export const BASE_TOKEN_URI = 'https://critter.fyi/token/';
export const CONTRACT_CRITTER = 'Critter';
export const CRITTER_SYMBOL = 'CRTTR';

// libraries
export const LIB_ACCOUNTABLE = 'Accountable';
export const LIB_BANKABLE = 'Bankable';
export const LIB_VIRAL = 'Viral';

// fees (in wei)
export const PLATFORM_FEE = utils.parseEther('0.00008');
export const PLATFORM_TAKE_RATE = 10;

// role ID's
export const OPERATOR_ROLE = utils.id('OPERATOR_ROLE');
export const MODERATOR_ROLE = utils.id('MODERATOR_ROLE');
export const TREASURER_ROLE = utils.id('TREASURER_ROLE');
export const UPGRADER_ROLE = utils.id('UPGRADER_ROLE');

// levels
export const BONUS = 3;
export const MAX_LEVEL = 50;

// thresholds
export const DIVIDEND_THRESHOLD = utils.parseEther('0.1');
export const VIRALITY_THRESHOLD = 95;

// initializer
export const CONTRACT_INITIALIZER = [
  DIVIDEND_THRESHOLD,
  MAX_LEVEL,
  VIRALITY_THRESHOLD,
];

// test variables
export const EMPTY_BYTE_STRING = utils.hexlify(utils.toUtf8Bytes(''));
export const OVERFLOW = constants.MaxUint256.add(BigNumber.from(1));

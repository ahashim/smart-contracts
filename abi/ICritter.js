export default [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'dividendThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxLevel',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'viralThreshold',
        type: 'uint256',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'enum Configuration',
        name: 'configuration',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'updateConfiguration',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

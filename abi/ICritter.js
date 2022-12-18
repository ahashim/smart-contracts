export default [
  {
    inputs: [
      {
        internalType: 'string',
        name: 'baseURI',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'platformFee',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'takeRate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'poolThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'viralThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'bonus',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxLevel',
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

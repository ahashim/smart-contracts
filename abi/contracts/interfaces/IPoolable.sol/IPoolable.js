export default [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getPoolInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'shares',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'passCount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'blockNumber',
            type: 'uint256',
          },
          {
            internalType: 'uint64',
            name: 'score',
            type: 'uint64',
          },
        ],
        internalType: 'struct IStoreable.PoolInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getPoolPasses',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'shares',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStoreable.PoolPassInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'leavePool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

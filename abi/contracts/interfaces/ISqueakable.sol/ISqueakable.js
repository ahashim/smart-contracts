export default [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'author',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'content',
        type: 'string',
      },
    ],
    name: 'SqueakCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'deletedBy',
        type: 'address',
      },
    ],
    name: 'SqueakDeleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'enum Interaction',
        name: 'interaction',
        type: 'uint8',
      },
    ],
    name: 'SqueakInteraction',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'content',
        type: 'string',
      },
    ],
    name: 'createSqueak',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'deleteSqueak',
    outputs: [],
    stateMutability: 'payable',
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
    name: 'getSentimentCounts',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'dislikes',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'likes',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'resqueaks',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStoreable.SentimentCounts',
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
      {
        internalType: 'enum Interaction',
        name: 'interaction',
        type: 'uint8',
      },
    ],
    name: 'interact',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

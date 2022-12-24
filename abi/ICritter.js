export default [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'username',
        type: 'bytes32',
      },
    ],
    name: 'AccountCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'relative',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'enum Relation',
        name: 'action',
        type: 'uint8',
      },
    ],
    name: 'RelationshipUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'enum Status',
        name: 'status',
        type: 'uint8',
      },
    ],
    name: 'StatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'newUsername',
        type: 'string',
      },
    ],
    name: 'UsernameUpdated',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'username',
        type: 'string',
      },
    ],
    name: 'createAccount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
        internalType: 'address',
        name: 'userOne',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'userTwo',
        type: 'address',
      },
    ],
    name: 'isBlocked',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'userOne',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'userTwo',
        type: 'address',
      },
    ],
    name: 'isFollowing',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
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
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'enum Relation',
        name: 'action',
        type: 'uint8',
      },
    ],
    name: 'updateRelationship',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'enum Status',
        name: 'status',
        type: 'uint8',
      },
    ],
    name: 'updateStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'newUsername',
        type: 'string',
      },
    ],
    name: 'updateUsername',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

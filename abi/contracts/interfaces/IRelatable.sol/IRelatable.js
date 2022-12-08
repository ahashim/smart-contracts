export default [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "relative",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum Relation",
        "name": "action",
        "type": "uint8"
      }
    ],
    "name": "RelationshipUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "userOne",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "userTwo",
        "type": "address"
      }
    ],
    "name": "isBlocked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "userOne",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "userTwo",
        "type": "address"
      }
    ],
    "name": "isFollowing",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "enum Relation",
        "name": "action",
        "type": "uint8"
      }
    ],
    "name": "updateRelationship",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

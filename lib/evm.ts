export const profileABI = [
  {
    type: "function",
    name: "get",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "value",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBatch",
    inputs: [
      {
        name: "addrs",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "keys",
        type: "string[]",
        internalType: "string[]",
      },
    ],
    outputs: [
      {
        name: "values",
        type: "bytes[][]",
        internalType: "bytes[][]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "set",
    inputs: [
      {
        name: "key",
        type: "string",
        internalType: "string",
      },
      {
        name: "value",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setBatch",
    inputs: [
      {
        name: "keys",
        type: "string[]",
        internalType: "string[]",
      },
      {
        name: "values",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

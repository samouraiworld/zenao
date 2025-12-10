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

export const ticketMasterABI = [
  {
    name: "cancelTicket",
    type: "function",
    inputs: [
      { name: "ticketPubKey", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "capacity",
    type: "function",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "checkin",
    type: "function",
    inputs: [
      { name: "ticketPubKey", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "checkins",
    type: "function",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "emitTicket",
    type: "function",
    inputs: [
      { name: "eventAddr", type: "address", internalType: "address" },
      { name: "ticketPubKey", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "roles_mod",
    type: "function",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    name: "sale_end",
    type: "function",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "setCapacity",
    type: "function",
    inputs: [{ name: "newCapacity", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setRolesMod",
    type: "function",
    inputs: [
      { name: "newRolesMode", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setSaleEnd",
    type: "function",
    inputs: [{ name: "newSaleEnd", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "sold_tickets",
    type: "function",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const ticketMasterAddress = "0xA2f106ecEA274119d90df9f1d1A67a734E6955C4";

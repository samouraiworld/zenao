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
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelTicket",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "capacity",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkin",
    inputs: [
      {
        name: "gatekeeper",
        type: "address",
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "checkins",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creator",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "emitTicket",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "events_by_sale_end",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "queryEvents",
    inputs: [
      {
        name: "from",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "to",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "res",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "queryEventsReverse",
    inputs: [
      {
        name: "from",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "to",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "res",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "roles_mod",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sale_end",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setCapacity",
    inputs: [
      {
        name: "newCapacity",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCreator",
    inputs: [
      {
        name: "creatorAddr",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setRolesMod",
    inputs: [
      {
        name: "newRolesMode",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setSaleEnd",
    inputs: [
      {
        name: "newSaleEnd",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "discoverable",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sold_tickets",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ticket_by_owner",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ticket_owner",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CreatorSet",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "creatorAddr",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SaleEndSet",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "saleEnd",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "discoverable",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TicketCancelled",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TicketEmitted",
    inputs: [
      {
        name: "eventAddr",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "owner",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "ticketPubKey",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
] as const;

export const ticketMasterAddress = "0x33addc84F5a81C9d42447294196cfC4388811231";

# EVM Smart Contracts for Zenao

This document describes the smart contracts that need to be deployed for the EVM profile integration.

## Overview

The Zenao EVM integration uses two smart contracts:

1. **Profile Contract**: Stores user profile data on-chain (avatar, display name, bio)
2. **UserRegistry Contract**: Maps Clerk userId to EVM wallet addresses

## Architecture

```
Clerk userId (user_xxx) <---> UserRegistry Contract <---> Wallet Address (0x...)
                                                              |
                                                              v
                                                    Profile Contract
                                                    (stores profile data)
```

## 1. Profile Contract

### Purpose
Stores user profile information on the blockchain.

### Functions

```solidity
// Read a single profile field
function get(address addr, string memory key) public view returns (bytes memory value)

// Read multiple fields for multiple users (batch operation)
function getBatch(address[] memory addrs, string[] memory keys) public view returns (bytes[][] memory values)

// Write a single profile field
function set(string memory key, bytes memory value) public

// Write multiple profile fields (batch operation)
function setBatch(string[] memory keys, bytes[] memory values) public
```

### Profile Keys
- `pfp`: Profile picture (avatar URI, stored as UTF-8 hex)
- `dn`: Display name (stored as UTF-8 hex)
- `bio`: Biography (IPFS CID pointing to the full bio content, stored as UTF-8 hex)

### Solidity Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Profile {
    // Nested mapping: user address -> key -> value
    mapping(address => mapping(string => bytes)) private profiles;

    event ProfileUpdated(address indexed user, string key, bytes value);

    // Get a single value for an address
    function get(address addr, string memory key) public view returns (bytes memory) {
        return profiles[addr][key];
    }

    // Get multiple values for multiple addresses
    function getBatch(
        address[] memory addrs,
        string[] memory keys
    ) public view returns (bytes[][] memory) {
        bytes[][] memory results = new bytes[][](addrs.length);

        for (uint i = 0; i < addrs.length; i++) {
            results[i] = new bytes[](keys.length);
            for (uint j = 0; j < keys.length; j++) {
                results[i][j] = profiles[addrs[i]][keys[j]];
            }
        }

        return results;
    }

    // Set a single value for the sender
    function set(string memory key, bytes memory value) public {
        profiles[msg.sender][key] = value;
        emit ProfileUpdated(msg.sender, key, value);
    }

    // Set multiple values for the sender
    function setBatch(string[] memory keys, bytes[] memory values) public {
        require(keys.length == values.length, "Keys and values length mismatch");

        for (uint i = 0; i < keys.length; i++) {
            profiles[msg.sender][keys[i]] = values[i];
            emit ProfileUpdated(msg.sender, keys[i], values[i]);
        }
    }
}
```

## 2. UserRegistry Contract

### Purpose
Maps Clerk userId to EVM wallet addresses. Ensures one-to-one relationship.

### Functions

```solidity
// Link the caller's wallet to a userId (can only be called once per wallet)
function linkWallet(string memory userId) public

// Get the wallet address for a userId
function getWallet(string memory userId) public view returns (address)

// Get the userId for a wallet address
function getUserId(address wallet) public view returns (string memory)
```

### Solidity Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserRegistry {
    // userId -> wallet address
    mapping(string => address) private userIdToWallet;

    // wallet address -> userId
    mapping(address => string) private walletToUserId;

    event WalletLinked(string indexed userId, address indexed wallet);

    // Link the caller's wallet to a userId
    function linkWallet(string memory userId) public {
        require(bytes(userId).length > 0, "UserId cannot be empty");
        require(
            walletToUserId[msg.sender].length == 0,
            "Wallet already linked to a userId"
        );
        require(
            userIdToWallet[userId] == address(0),
            "UserId already linked to a wallet"
        );

        userIdToWallet[userId] = msg.sender;
        walletToUserId[msg.sender] = userId;

        emit WalletLinked(userId, msg.sender);
    }

    // Get the wallet address for a userId
    function getWallet(string memory userId) public view returns (address) {
        return userIdToWallet[userId];
    }

    // Get the userId for a wallet address
    function getUserId(address wallet) public view returns (string memory) {
        return walletToUserId[wallet];
    }
}
```

## Deployment Steps

### Prerequisites
- Node.js and npm installed
- Hardhat or Foundry installed
- RPC endpoint for your target chain (e.g., Alchemy, Infura)
- Wallet with native tokens for gas fees

### Using Hardhat

1. Install Hardhat:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
```

3. Deploy the contracts:
```bash
# Deploy Profile contract
npx hardhat run scripts/deploy-profile.js --network sepolia

# Deploy UserRegistry contract
npx hardhat run scripts/deploy-user-registry.js --network sepolia
```

4. Copy the deployed contract addresses to `.env.local`:
```bash
NEXT_PUBLIC_EVM_PROFILE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS=0x...
```

## Testing Locally

You can test with a local blockchain:

```bash
# Start a local Hardhat node
npx hardhat node

# Deploy contracts to local network
npx hardhat run scripts/deploy-profile.js --network localhost
npx hardhat run scripts/deploy-user-registry.js --network localhost

# Update .env.local with local RPC
NEXT_PUBLIC_EVM_RPC=http://127.0.0.1:8545
```

## Security Considerations

1. **Profile Contract**: Anyone can read any profile, but only the wallet owner can update their own profile
2. **UserRegistry Contract**: Wallet linking is permanent and cannot be changed (prevents account hijacking)
3. **Gas Costs**: Batch operations save gas by reducing transaction overhead
4. **IPFS for Bio**: Large bio content is stored on IPFS, only the CID is stored on-chain

## Supported Networks

The Web3Auth configuration currently supports:
- Chain ID `0xaa37dc` (11155420 in decimal) - Optimism Sepolia Testnet
- Chain ID `0x14a34` (84532 in decimal) - Base Sepolia Testnet

You can deploy to either of these testnets or configure additional networks in [web3-auth-provider.tsx](../app/web3-auth-provider.tsx).

## Next Steps

1. Choose a testnet (Optimism Sepolia or Base Sepolia recommended)
2. Get testnet tokens from a faucet
3. Deploy both contracts
4. Update `.env.local` with the contract addresses and RPC URL
5. Test profile creation and updates
6. Once tested, deploy to mainnet

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Optimism Sepolia Faucet](https://app.optimism.io/faucet)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

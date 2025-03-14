import { Post } from "@/app/gen/feeds/v1/feeds_pb";

export const fakeStandardPosts: Post[] = [
  {
    author: "alice",
    parentUri: "",
    loc: { lat: 48.8566, lng: 2.3522 },
    createdAt: BigInt(1710432000),
    updatedAt: BigInt(1710433000),
    deletedAt: BigInt(0),
    tags: ["typescript", "web3"],
    post: {
      case: "standard",
      value: {
        content:
          "Exploring TypeScript with Web3 today! Diving deep into the intersection of strongly typed JavaScript and decentralized applications. It's fascinating to see how TypeScript improves development efficiency while working with Web3 libraries like ethers.js and CosmJS.",
      },
    },
  },
  {
    author: "bob",
    parentUri: "",
    loc: { lat: 40.7128, lng: -74.006 },
    createdAt: BigInt(1710432100),
    updatedAt: BigInt(1710433100),
    deletedAt: BigInt(0),
    tags: ["crypto", "rust"],
    post: {
      case: "standard",
      value: {
        content:
          "Rust is amazing for blockchain development! The safety guarantees and performance optimizations make it ideal for writing secure smart contracts. I'm currently experimenting with CosmWasm to deploy a contract on a Cosmos-based blockchain.",
      },
    },
  },
  {
    author: "charlie",
    parentUri: "",
    loc: { lat: 35.6895, lng: 139.6917 },
    createdAt: BigInt(1710432200),
    updatedAt: BigInt(1710433200),
    deletedAt: BigInt(0),
    tags: ["cosmwasm", "smartcontracts"],
    post: {
      case: "standard",
      value: {
        content:
          "Deploying a new CosmWasm smart contract today! Excited to test out some new features related to tokenized governance and on-chain voting mechanisms. I’m using cw-plus libraries to speed up development and ensure modularity.",
      },
    },
  },
  {
    author: "dave",
    parentUri: "",
    loc: { lat: 51.5074, lng: -0.1278 },
    createdAt: BigInt(1710432300),
    updatedAt: BigInt(1710433300),
    deletedAt: BigInt(0),
    tags: ["go", "backend"],
    post: {
      case: "standard",
      value: {
        content:
          "Building a gRPC backend in Go. Implementing efficient microservices communication using Protocol Buffers. The performance boost compared to REST is significant, especially for high-throughput applications.",
      },
    },
  },
  {
    author: "eve",
    parentUri: "",
    loc: { lat: 37.7749, lng: -122.4194 },
    createdAt: BigInt(1710432400),
    updatedAt: BigInt(1710433400),
    deletedAt: BigInt(0),
    tags: ["postgres", "database"],
    post: {
      case: "standard",
      value: {
        content:
          "Optimizing queries in PostgreSQL. Just learned about indexing strategies and how to use EXPLAIN ANALYZE to detect bottlenecks. Materialized views seem like a great way to speed up expensive queries!",
      },
    },
  },
  {
    author: "frank",
    parentUri: "",
    loc: { lat: -33.8688, lng: 151.2093 },
    createdAt: BigInt(1710432500),
    updatedAt: BigInt(1710433500),
    deletedAt: BigInt(0),
    tags: ["docker", "kubernetes"],
    post: {
      case: "standard",
      value: {
        content:
          "Deploying microservices with Kubernetes! Setting up Helm charts and fine-tuning resource allocations to make sure my services scale efficiently. Also exploring service meshes like Istio for better observability.",
      },
    },
  },
  {
    author: "grace",
    parentUri: "",
    loc: { lat: 34.0522, lng: -118.2437 },
    createdAt: BigInt(1710432600),
    updatedAt: BigInt(1710433600),
    deletedAt: BigInt(0),
    tags: ["react", "frontend"],
    post: {
      case: "standard",
      value: {
        content:
          "React Hooks are super useful for state management. Moving away from Redux for simpler applications and leveraging useState and useContext instead. The new React Server Components also look promising!",
      },
    },
  },
  {
    author: "henry",
    parentUri: "",
    loc: { lat: 41.9028, lng: 12.4964 },
    createdAt: BigInt(1710432700),
    updatedAt: BigInt(1710433700),
    deletedAt: BigInt(0),
    tags: ["nft", "marketplace"],
    post: {
      case: "standard",
      value: {
        content:
          "Working on an NFT marketplace using CosmWasm. Implementing royalties using the cw2981 standard and exploring ways to integrate on-chain auctions. Also considering decentralized storage options like IPFS for metadata.",
      },
    },
  },
  {
    author: "isabelle",
    parentUri: "",
    loc: { lat: 55.7558, lng: 37.6173 },
    createdAt: BigInt(1710432800),
    updatedAt: BigInt(1710433800),
    deletedAt: BigInt(0),
    tags: ["typescript", "testing"],
    post: {
      case: "standard",
      value: {
        content:
          "Cypress is great for E2E testing! Writing automated tests to cover different user flows and integrating them into the CI/CD pipeline for continuous deployment. Also looking into Playwright as an alternative.",
      },
    },
  },
  {
    author: "jack",
    parentUri: "",
    loc: { lat: 19.076, lng: 72.8777 },
    createdAt: BigInt(1710432900),
    updatedAt: BigInt(1710433900),
    deletedAt: BigInt(0),
    tags: ["blockchain", "wallet"],
    post: {
      case: "standard",
      value: {
        content:
          "Testing a new crypto wallet integration. Ensuring seamless transaction signing with Keplr and Ledger hardware wallets. Security and UX are top priorities, especially for non-technical users entering the Web3 space.",
      },
    },
  },
];

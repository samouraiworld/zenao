import { PostView } from "@/app/gen/feeds/v1/feeds_pb";
import { Poll, PollKind } from "@/app/gen/polls/v1/polls_pb";

export interface PollPostView extends PostView {
  poll: Poll;
}

export const fakeStandardPosts: PostView[] = [
  {
    reactions: [
      { icon: "👍", count: 5, userHasVoted: true },
      { icon: "❤️", count: 3, userHasVoted: false },
      { icon: "😂", count: 2, userHasVoted: false },
    ],
    post: {
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
  },
  {
    reactions: [
      { icon: "👍", count: 2, userHasVoted: true },
      { icon: "🔥", count: 4, userHasVoted: true },
      { icon: "😢", count: 1, userHasVoted: false },
    ],
    post: {
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
  },
  {
    reactions: [
      { icon: "👍", count: 7, userHasVoted: false },
      { icon: "❤️", count: 5, userHasVoted: false },
      { icon: "🎉", count: 3, userHasVoted: false },
    ],
    post: {
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
  },
  {
    reactions: [
      { icon: "👍", count: 5, userHasVoted: true },
      { icon: "❤️", count: 3, userHasVoted: false },
      { icon: "😂", count: 2, userHasVoted: true },
      { icon: "😀", count: 2, userHasVoted: true },
    ],
    post: {
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
  },
  {
    reactions: [
      { icon: "👍", count: 7, userHasVoted: false },
      { icon: "❤️", count: 5, userHasVoted: false },
      { icon: "🎉", count: 3, userHasVoted: false },
    ],
    post: {
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
  },
  {
    reactions: [
      { icon: "👍", count: 5, userHasVoted: true },
      { icon: "❤️", count: 3, userHasVoted: false },
      { icon: "😂", count: 2, userHasVoted: false },
    ],
    post: {
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
  },
];

export const fakePollPosts: PollPostView[] = [
  {
    reactions: [
      { icon: "👍", count: 5, userHasVoted: true },
      { icon: "❤️", count: 3, userHasVoted: true },
      { icon: "😂", count: 2, userHasVoted: false },
    ],
    post: {
      parentUri: "",
      tags: ["typescript", "web3"],
      loc: { lat: 48.8566, lng: 2.3522 },
      deletedAt: BigInt(0),
      createdAt: BigInt(1738369957),
      author: "pizzaLover99",
      post: {
        case: "link",
        value: {
          uri: "",
        },
      },
    },
    poll: {
      question: "What's your favorite type of pizza topping?",
      results: [
        { option: "Pepperoni", count: 120, hasUserVoted: true },
        { option: "Mushrooms", count: 80, hasUserVoted: false },
        { option: "Pineapple", count: 50, hasUserVoted: true },
        { option: "Extra Cheese", count: 90, hasUserVoted: false },
      ],
      kind: PollKind.MULTIPLE_CHOICE,
      duration: BigInt(2819200),
      createdAt: BigInt(1738369957),
    },
  },
  {
    reactions: [
      { icon: "🔥", count: 4, userHasVoted: false },
      { icon: "😢", count: 1, userHasVoted: false },
    ],

    post: {
      parentUri: "",
      tags: ["typescript", "web3"],
      loc: { lat: 40.7128, lng: -74.006 },
      deletedAt: BigInt(0),
      createdAt: BigInt(1738369957),
      author: "natureFanatic",
      post: {
        case: "link",
        value: {
          uri: "",
        },
      },
    },
    poll: {
      question: "Which season do you enjoy the most?",
      results: [
        { option: "Spring", count: 150, hasUserVoted: false },
        { option: "Summer", count: 200, hasUserVoted: true },
        { option: "Fall", count: 100, hasUserVoted: false },
        { option: "Winter", count: 75, hasUserVoted: false },
      ],
      kind: PollKind.SINGLE_CHOICE,
      duration: BigInt(12419200),
      createdAt: BigInt(1738369957),
    },
  },
  {
    reactions: [
      { icon: "👍", count: 7, userHasVoted: true },
      { icon: "❤️", count: 5, userHasVoted: false },
      { icon: "🎉", count: 3, userHasVoted: false },
      { icon: "😀", count: 3, userHasVoted: true },
    ],

    post: {
      parentUri: "",
      tags: ["typescript", "web3"],
      loc: { lat: 34.0522, lng: -118.2437 },
      deletedAt: BigInt(0),
      createdAt: BigInt(1738369957),
      author: "breakfastKing",
      post: {
        case: "link",
        value: {
          uri: "",
        },
      },
    },
    poll: {
      question: "What's your go-to breakfast food?",
      results: [
        { option: "Pancakes", count: 180, hasUserVoted: true },
        { option: "Eggs and Bacon", count: 150, hasUserVoted: false },
        { option: "Cereal", count: 100, hasUserVoted: false },
        { option: "Avocado Toast", count: 70, hasUserVoted: false },
      ],
      kind: PollKind.SINGLE_CHOICE,
      duration: BigInt(91432000),
      createdAt: BigInt(1738369957),
    },
  },
  {
    reactions: [
      { icon: "👍", count: 5, userHasVoted: false },
      { icon: "❤️", count: 3, userHasVoted: false },
      { icon: "😂", count: 2, userHasVoted: false },
    ],
    post: {
      parentUri: "",
      tags: ["typescript", "web3"],
      loc: { lat: 51.5074, lng: -0.1278 },
      deletedAt: BigInt(0),
      createdAt: BigInt(1738369957),
      author: "storyLover22",
      post: {
        case: "link",
        value: {
          uri: "",
        },
      },
    },
    poll: {
      question: "Which fictional character would you want as your best friend?",
      results: [
        { option: "Sherlock Holmes", count: 90, hasUserVoted: false },
        { option: "Hermione Granger", count: 120, hasUserVoted: true },
        { option: "Tony Stark", count: 110, hasUserVoted: false },
        { option: "SpongeBob SquarePants", count: 60, hasUserVoted: false },
      ],
      kind: PollKind.SINGLE_CHOICE,
      duration: BigInt(100500),
      createdAt: BigInt(1738369957),
    },
  },
  {
    reactions: [
      { icon: "👍", count: 2, userHasVoted: false },
      { icon: "🔥", count: 4, userHasVoted: true },
      { icon: "😢", count: 1, userHasVoted: true },
    ],

    post: {
      parentUri: "",
      tags: ["typescript", "web3"],
      loc: { lat: 37.7749, lng: -122.4194 },
      deletedAt: BigInt(0),
      createdAt: BigInt(1738369957),
      author: "weekendWarrior",
      post: {
        case: "link",
        value: {
          uri: "",
        },
      },
    },
    poll: {
      question: "What's your favorite way to spend a weekend?",
      results: [
        { option: "Netflix and Chill", count: 200, hasUserVoted: true },
        { option: "Hiking", count: 100, hasUserVoted: false },
        { option: "Shopping", count: 80, hasUserVoted: false },
        { option: "Cooking", count: 70, hasUserVoted: false },
      ],
      kind: PollKind.MULTIPLE_CHOICE,
      duration: BigInt(259200),
      createdAt: BigInt(1738369957),
    },
  },
];

import { StandardPostView, SocialFeedPost } from "@/lib/social-feed";
// import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";

export const mockStandardPost: StandardPostView = {
  $typeName: "feeds.v1.PostView",
  childrenCount: BigInt(0),
  post: {
    $typeName: "feeds.v1.Post",
    localPostId: BigInt(1),
    deletedAt: BigInt(0),
    parentUri: "",
    updatedAt: BigInt(0),
    author: "usss",
    post: {
      case: "standard",
      value: {
        $typeName: "feeds.v1.StandardPost",
        content: "This is a standard post",
      },
    },
    tags: [],
    createdAt: BigInt(Date.now()),
  },
  reactions: [],
};

// export const mockPollPost: PollPostView = {
//   post: {
//     localPostId: "poll-post-1",
//     author: { id: "user2", name: "Bob" },
//     post: {
//       case: "link",
//       value: {
//         uri: "poll://1234",
//         title: "Poll: Favorite language?",
//         description: "Choose your favorite programming language.",
//         // Add other LinkPost fields as needed
//       },
//     },
//     tags: ["poll"],
//     createdAt: Date.now(),
//   },
//   reactions: [],
//   commentsCount: 0,
//   sharesCount: 0,
// };

// export const mockPollPostWithInfo: PollPostViewInfo = {
//   ...mockPollPost,
//   poll: {
//     id: "1234",
//     question: "What's your favorite programming language?",
//     options: [
//       { id: "1", label: "TypeScript" },
//       { id: "2", label: "Python" },
//       { id: "3", label: "Rust" },
//     ],
//     votes: [],
//     totalVotes: 0,
//     // Add additional Poll fields as needed
//   },
// };

export const mockSocialFeedPosts: SocialFeedPost[] = [
  {
    postType: "standard",
    data: mockStandardPost,
  },
  // {
  //   postType: "poll",
  //   data: mockPollPost,
  // },
];

import { multiaddr, resolvers, createProtocol } from "@multiformats/multiaddr";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";

export const tryOut = (posts: PostView[]) => {
  const polls = posts.filter((post) => {
    return post.post?.post.case === "link" && post.post?.tags?.includes("poll");
  });

  console.log("Polls: ", polls);

  // muut

  // Multiaddr to fetch poll id
  // const
};

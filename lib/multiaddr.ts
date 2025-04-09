import { multiaddr, registerProtocol } from "@multiformats/multiaddr";

registerProtocol({
  name: "poll",
  code: 0x301,
  size: 64,
});

registerProtocol({
  name: "gno",
  code: 0x300,
  size: -1,
  path: true,
  resolvable: false,
});

export const parsePollUri = (uri: string) => {
  const parsed = multiaddr(uri);
  const protoNames = parsed.protoNames();

  if (!protoNames.includes("gno") || !protoNames.includes("poll")) {
    throw new Error("Invalid URI: must contain both gno and poll protocols");
  }

  const gnoPath = parsed.getPath()?.slice(1);
  const pollId = new TextDecoder().decode(parsed.tuples()[0][1]);

  return { gnoPath, pollId };
};

// export const tryOut = (posts: PostView[]) => {
//   const polls = posts.filter((post) => {
//     return post.post?.post.case === "link" && post.post?.tags?.includes("poll");
//   });

//   parsePollUri(example);

//   // console.log(fromString("gnolandr/zenao/polls", "base16"));

//   // muut

//   // Multiaddr to fetch poll id
//   // const
// };

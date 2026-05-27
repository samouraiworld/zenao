import { multiaddr, registerProtocol } from "@multiformats/multiaddr";

registerProtocol({
  name: "poll",
  code: 0x301,
  size: 64,
});

export const parsePollUri = (uri: string) => {
  const parsed = multiaddr(uri);
  const protoNames = parsed.protoNames();

  if (!protoNames.includes("poll")) {
    throw new Error("Invalid URI: must contain poll protocol");
  }

  const pollId = new TextDecoder().decode(parsed.tuples()[0][1]).slice(1);

  return { pollId };
};

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

  const packagePath = parsed.getPath()?.slice(1);

  if (!packagePath) {
    throw new Error("Invalid URI: missing package path");
  }

  const pollId = new TextDecoder().decode(parsed.tuples()[0][1]);

  return { packagePath, pollId };
};

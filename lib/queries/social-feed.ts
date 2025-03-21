import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { fromJson } from "@bufbuild/protobuf";
import { extractGnoJSONResponse } from "@/lib/gno";
import { PostViewJson, PostViewSchema } from "@/app/gen/feeds/v1/feeds_pb";

export const feedPosts = (
  eventId: string,
  offset: number,
  limit: number,
  tags: string,
  userAddress: string,
) =>
  queryOptions({
    queryKey: ["feedPosts", eventId, offset, limit, tags, userAddress],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        "gno.land/r/zenao/social_feed",
        `PostViewsToJSON(GetFeedPosts("${eventId}", ${offset}, ${limit}, "${tags}", "${userAddress}"))`,
      );
      const raw = extractGnoJSONResponse(res);
      return postViewsFromJson(raw);
    },
  });

function postViewsFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(PostViewSchema, elem as PostViewJson));
}

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { fromJson } from "@bufbuild/protobuf";
import { derivePkgAddr, extractGnoJSONResponse } from "@/lib/gno";
import { PostViewJson, PostViewSchema } from "@/app/gen/feeds/v1/feeds_pb";
import { PollJson, PollSchema } from "@/app/gen/polls/v1/polls_pb";

export const feedPosts = (
  eventId: string,
  limit: number,
  tags: string,
  userAddress: string,
) =>
  infiniteQueryOptions({
    queryKey: ["feedPosts", eventId, tags, userAddress],
    queryFn: async ({ pageParam = 0 }) => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const pkgPath = `gno.land/r/zenao/events/e${eventId}`;
      const feedId = `${derivePkgAddr(pkgPath)}:main`;

      const res = await client.evaluateExpression(
        "gno.land/r/zenao/social_feed",
        `PostViewsToJSON(GetFeedPosts("${feedId}", ${pageParam * limit}, ${limit}, "${tags}", "${userAddress}"))`,
      );
      const raw = extractGnoJSONResponse(res);
      return postViewsFromJson(raw);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limit) {
        return undefined;
      }
      return pages.length;
    },
  });

function postViewsFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(PostViewSchema, elem as PostViewJson));
}

export const pollInfo = (pollId: string, userAddress: string) =>
  queryOptions({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );

      const res = await client.evaluateExpression(
        "gno.land/r/zenao/polls",
        `pollToJSON(GetInfo(${parseInt(pollId)}, "${userAddress}"))`,
      );

      const raw = extractGnoJSONResponse(res) as PollJson;
      return fromJson(PollSchema, raw);
    },
  });

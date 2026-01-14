import type { MetadataRoute } from "next";
import { getQueryClient } from "@/lib/get-query-client";
import { eventsList } from "@/lib/queries/events-list";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchInfiniteQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 25000),
  );
  const past = await queryClient.fetchInfiniteQuery(
    eventsList(now - 1, 0, 25000),
  );

  return [...upcoming.pages[0], ...past.pages[0]].map((event) => {
    return {
      url: `https://zenao.io/event/${event.id}`,
    };
  });
}

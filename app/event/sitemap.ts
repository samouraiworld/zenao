import type { MetadataRoute } from "next";
import { getQueryClient } from "@/lib/get-query-client";
import { eventsList } from "@/lib/queries/events-list";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 25000),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 25000));

  return [...upcoming, ...past].map((event) => {
    const lastSlashIdx = event.pkgPath.lastIndexOf("/");
    const id = event.pkgPath.substring(lastSlashIdx + 2); // skip the slash and the e
    return {
      url: `https://zenao.io/event/${id}`,
    };
  });
}

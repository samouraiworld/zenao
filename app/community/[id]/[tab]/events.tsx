"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import EmptyList from "@/components/widgets/lists/empty-list";
import Heading from "@/components/widgets/texts/heading";
import { communityUsersWithRoles } from "@/lib/queries/community";
import { eventsPkgPathsByAddrs } from "@/lib/queries/events-list";
import { eventIdFromPkgPath, eventOptions } from "@/lib/queries/event";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

type CommunityEventsProps = {
  communityId: string;
  now: number;
};

function CommunityEvents({ communityId, now: _now }: CommunityEventsProps) {
  const t = useTranslations();
  const { data: eventsAddresses } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["event"]),
  );
  const { data: eventsPkgPaths } = useSuspenseQuery(
    eventsPkgPathsByAddrs(eventsAddresses.map((e) => e.address)),
  );

  const events = useSuspenseQueries({
    queries: eventsPkgPaths.map((pkgPath) =>
      eventOptions(eventIdFromPkgPath(pkgPath)),
    ),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<EventInfo, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => elem.data),
  });

  console.log(events);

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        Hosting events ({0})
      </Heading>

      <div className="flex flex-col gap-0">
        <EmptyList
          title={t("no-events-title")}
          description={t("no-events-description")}
        />
      </div>

      <Heading level={2} size="lg">
        Past events ({0})
      </Heading>

      <div className="flex flex-col gap-0">
        <EmptyList
          title={t("no-events-title")}
          description={t("no-events-description")}
        />
      </div>
    </div>
  );
}

export default CommunityEvents;

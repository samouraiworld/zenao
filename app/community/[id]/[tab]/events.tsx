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
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";

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
        .map((elem, idx) => ({ ...elem.data, pkgPath: eventsPkgPaths[idx] })),
  });

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4">
        <Heading level={2} size="lg">
          {t("community.events")}
        </Heading>

        <div className="flex flex-col gap-0">
          {events.length === 0 && (
            <EmptyList
              title={t("no-events-title")}
              description={t("no-events-description")}
            />
          )}
        </div>

        <EventCardListLayout>
          {events.map((evt) => (
            <EventCard
              key={evt.pkgPath}
              evt={evt}
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
            />
          ))}
        </EventCardListLayout>
      </div>
    </div>
  );
}

export default CommunityEvents;

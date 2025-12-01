"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import EmptyList from "@/components/widgets/lists/empty-list";
import Heading from "@/components/widgets/texts/heading";
import { communityUsersWithRoles } from "@/lib/queries/community";

import { eventIdFromPkgPath, eventOptions } from "@/lib/queries/event";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";

type CommunityEventsProps = {
  communityId: string;
  now: number;
};

function CommunityEvents({ communityId, now: _now }: CommunityEventsProps) {
  const t = useTranslations();
  const { data: eventsRoles } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["event"]),
  );

  const events = useSuspenseQueries({
    queries: eventsRoles.map((role) =>
      eventOptions(eventIdFromPkgPath(role.realmId)),
    ),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<EventInfo, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem, idx) => ({
          ...elem.data,
          pkgPath: eventsRoles[idx].realmId,
        })),
  });

  const sortedEvents = useMemo(() => {
    return events.sort((a, b) => {
      return Number(b.startDate) - Number(a.startDate);
    });
  }, [events]);

  const upcomingEvents = useMemo(
    () =>
      sortedEvents.filter((evt) => {
        return Number(evt.endDate) * 1000 >= BigInt(Date.now());
      }),
    [sortedEvents],
  );

  const pastEvents = useMemo(
    () =>
      sortedEvents.filter((evt) => {
        return Number(evt.endDate) * 1000 < BigInt(Date.now());
      }),
    [sortedEvents],
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              {t("community.upcoming")}
            </TabsTrigger>
            <TabsTrigger value="past">{t("community.past")}</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <div className="flex flex-col gap-0">
              {upcomingEvents.length === 0 && (
                <EmptyList
                  title={t("no-events-title")}
                  description={t("no-events-description")}
                />
              )}
            </div>
            <EventCardListLayout>
              {upcomingEvents.map((evt) => (
                <EventCard
                  key={evt.pkgPath}
                  evt={evt}
                  href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
                  fullDate
                />
              ))}
            </EventCardListLayout>
          </TabsContent>
          <TabsContent value="past">
            <div className="flex flex-col gap-0">
              {pastEvents.length === 0 && (
                <EmptyList
                  title={t("no-events-title")}
                  description={t("no-events-description")}
                />
              )}
            </div>
            <EventCardListLayout>
              {pastEvents.map((evt) => (
                <EventCard
                  key={evt.pkgPath}
                  evt={evt}
                  href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
                  fullDate
                />
              ))}
            </EventCardListLayout>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default CommunityEvents;

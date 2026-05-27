"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import EmptyList from "@/components/widgets/lists/empty-list";
import { communityUsersWithRoles } from "@/lib/queries/community";

import { eventOptions } from "@/lib/queries/event";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { SafeEventInfo } from "@/types/schemas";

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
    queries: eventsRoles.map((role) => eventOptions(role.entityId)),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<SafeEventInfo, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => ({
          ...elem.data,
        })),
  });

  const sortDescendingEvents = useMemo(() => {
    return events.sort((a, b) => {
      return Number(b.startDate) - Number(a.startDate);
    });
  }, [events]);

  const upcomingEvents = useMemo(
    () =>
      sortDescendingEvents.filter((evt) => {
        return Number(evt.endDate) * 1000 >= BigInt(Date.now());
      }),
    [sortDescendingEvents],
  );

  const pastEvents = useMemo(
    () =>
      sortDescendingEvents.filter((evt) => {
        return Number(evt.endDate) * 1000 < BigInt(Date.now());
      }),
    [sortDescendingEvents],
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
              {upcomingEvents.reverse().length === 0 && (
                <EmptyList
                  title={t("no-events-title")}
                  description={t("no-events-description")}
                />
              )}
            </div>
            <EventCardListLayout>
              {upcomingEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  evt={evt}
                  href={`/event/${evt.id}`}
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
                  key={evt.id}
                  evt={evt}
                  href={`/event/${evt.id}`}
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

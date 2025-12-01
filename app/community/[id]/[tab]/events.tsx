"use client";

import { useTranslations } from "next-intl";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import EmptyList from "@/components/widgets/lists/empty-list";
import Heading from "@/components/widgets/texts/heading";
import {
  communityAdministrators,
  communityInfo,
  communityUserRoles,
  communityUsersWithRoles,
} from "@/lib/queries/community";

import { eventIdFromPkgPath, eventOptions } from "@/lib/queries/event";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import { CommunityDetails, communityDetailsSchema } from "@/types/schemas";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { useToast } from "@/hooks/use-toast";
import { userInfoOptions } from "@/lib/queries/user";
import CommunityEventCard from "@/components/features/community/community-event-card";

type CommunityEventsProps = {
  communityId: string;
  now: number;
};

function CommunityEvents({ communityId, now: _now }: CommunityEventsProps) {
  const t = useTranslations();
  const { getToken, userId } = useAuth();

  const { data: userAddress } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress?.realmId),
  );

  const { data: community } = useSuspenseQuery(communityInfo(communityId));
  const { data: administrators } = useSuspenseQuery(
    communityAdministrators(communityId, getToken),
  );

  const { data: eventsRoles } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["event"]),
  );

  const isAdmin = useMemo(
    () => userRoles.includes("administrator"),
    [userRoles],
  );

  const { mutateAsync: editCommunity } = useEditCommunity();
  const { toast } = useToast();

  // Load pinned events list
  const { pinnedEvents: pinnedEventsPkgPath, ...otherDetails } =
    deserializeWithFrontMatter({
      contentFieldName: "description",
      schema: communityDetailsSchema,
      serialized: community?.description ?? "",
      defaultValue: {
        description: "",
        shortDescription: "",
        portfolio: [],
        socialMediaLinks: [],
        pinnedEvents: [],
      },
    });

  const [localPinnedEventsPkgPath, setLocalPinnedEventsPkgPath] =
    useState<string[]>(pinnedEventsPkgPath);

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

  const pinnedEvents = useMemo(
    () =>
      events.filter((evt) => {
        return (
          localPinnedEventsPkgPath.includes(evt.pkgPath) &&
          Number(evt.endDate) * 1000 >= Date.now() // Only show pinned events that are upcoming
        );
      }),
    [events, localPinnedEventsPkgPath],
  );

  const handlePinClick = async (evt: EventInfo) => {
    try {
      const token = await getToken();

      if (!token) throw new Error("User not authenticated");

      // Update pinned events in the community description
      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(otherDetails.description, {
        shortDescription: otherDetails.shortDescription,
        portfolio: otherDetails.portfolio,
        socialMediaLinks: otherDetails.socialMediaLinks,
        pinnedEvents: localPinnedEventsPkgPath,
      });

      await editCommunity({
        ...community,
        communityId,
        administrators,
        token,
        description,
      });

      // Update local pinned events state
      setLocalPinnedEventsPkgPath((prev) => {
        if (prev.includes(evt.pkgPath)) {
          toast({
            title: t("community.event-unpinned"),
          });
          return prev.filter((pkgPath) => pkgPath !== evt.pkgPath);
        } else {
          toast({
            title: t("community.event-pinned"),
          });

          return [...new Set([evt.pkgPath, ...prev])];
        }
      });
    } catch (error) {
      console.error("Failed to update pinned events:", error);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0">
          {events.length === 0 && (
            <EmptyList
              title={t("no-events-title")}
              description={t("no-events-description")}
            />
          )}
        </div>

        {pinnedEvents.length > 0 && (
          <>
            <Heading level={2} size="lg">
              {t("community.pinned-events")}
            </Heading>

            <EventCardListLayout>
              {pinnedEvents.map((evt) => (
                <CommunityEventCard
                  key={evt.pkgPath}
                  evt={evt}
                  href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
                  isAdmin={isAdmin}
                  pinned
                  onPin={() => handlePinClick(evt)}
                />
              ))}
            </EventCardListLayout>
          </>
        )}

        <Heading level={2} size="lg">
          {t("community.all-events")}
        </Heading>

        <EventCardListLayout>
          {events.map((evt) => (
            <CommunityEventCard
              key={evt.pkgPath}
              evt={evt}
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
              isAdmin={isAdmin}
              onPin={() => handlePinClick(evt)}
              pinned={localPinnedEventsPkgPath.includes(evt.pkgPath)}
            />
          ))}
        </EventCardListLayout>
      </div>
    </div>
  );
}

export default CommunityEvents;

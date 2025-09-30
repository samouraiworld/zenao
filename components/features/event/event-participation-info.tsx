"use client";

import { ClerkLoaded, ClerkLoading, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EventParticipation } from "./event-participation";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Card } from "@/components/widgets/cards/card";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";

type EventParticipationInfoProps = {
  eventId: string;
  eventData: EventInfo;
  password: string;
};

function EventParticipationInfo({
  eventId,
  eventData,
  password,
}: EventParticipationInfoProps) {
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));
  return (
    <>
      {/* Participate Card */}
      <ClerkLoading>
        <Skeleton className="w-full h-28" />
      </ClerkLoading>
      <ClerkLoaded>
        <Card className="mt-2">
          <EventParticipation
            eventId={eventId}
            eventData={eventData}
            roles={roles}
            password={password}
          >
            <EventParticipation.Registration />
            <EventParticipation.TooLate />
            <EventParticipation.SoldOut />
            <EventParticipation.Participant />
          </EventParticipation>
        </Card>
      </ClerkLoaded>
    </>
  );
}

export default EventParticipationInfo;

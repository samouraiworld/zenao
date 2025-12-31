"use client";

import { ClerkLoaded, ClerkLoading, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EventParticipation } from "./event-participation";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Card } from "@/components/widgets/cards/card";
import { eventUserRoles } from "@/lib/queries/event-users";
import { useEventPassword } from "@/components/providers/event-password-provider";
import { userInfoOptions } from "@/lib/queries/user";
import { SafeEventInfo } from "@/types/schemas";

type EventParticipationInfoProps = {
  eventId: string;
  eventData: SafeEventInfo;
};

function EventParticipationInfo({
  eventId,
  eventData,
}: EventParticipationInfoProps) {
  const { password } = useEventPassword();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.realmId),
  );

  return (
    <>
      {/* Participate Card */}
      <ClerkLoading>
        <Skeleton className="w-full h-28" />
      </ClerkLoading>
      <ClerkLoaded>
        <Card>
          <EventParticipation
            eventId={eventId}
            eventData={eventData}
            roles={roles}
            password={password}
          >
            <EventParticipation.Registration />
            <EventParticipation.TooLate />
            <EventParticipation.Participant />
          </EventParticipation>
        </Card>
      </ClerkLoaded>
    </>
  );
}

export default EventParticipationInfo;

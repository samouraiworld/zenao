"use client";

import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EventParticipation } from "./event-participation";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Card } from "@/components/widgets/cards/card";
import { eventUserRoles } from "@/lib/queries/event-users";
import { useEventPassword } from "@/components/providers/event-password-provider";
import { SafeEventInfo } from "@/types/schemas";
import useActor from "@/hooks/use-actor";

type EventParticipationInfoProps = {
  eventId: string;
  eventData: SafeEventInfo;
};

function EventParticipationInfo({
  eventId,
  eventData,
}: EventParticipationInfoProps) {
  const { password } = useEventPassword();
  const actor = useActor();
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, actor?.actingAs),
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

"use client";

import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { EventParticipation } from "./event-participation";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Card } from "@/components/widgets/cards/card";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { eventUserRoles } from "@/lib/queries/event-users";
import { useEventPassword } from "@/components/providers/event-password-provider";

type EventParticipationInfoProps = {
  eventId: string;
  eventData: EventInfo;
};

function EventParticipationInfo({
  eventId,
  eventData,
}: EventParticipationInfoProps) {
  const { password } = useEventPassword();
  const { address } = useAccount();
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));

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

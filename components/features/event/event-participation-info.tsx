"use client";

import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { EventParticipation } from "./event-participation";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Card } from "@/components/widgets/cards/card";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { EventUserRole } from "@/lib/queries/event-users";

type EventParticipationInfoProps = {
  eventId: string;
  eventData: EventInfo;
  roles: EventUserRole[];
  password: string;
};

function EventParticipationInfo({
  eventId,
  eventData,
  roles,
  password,
}: EventParticipationInfoProps) {
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
            <EventParticipation.Participant />
          </EventParticipation>
        </Card>
      </ClerkLoaded>
    </>
  );
}

export default EventParticipationInfo;

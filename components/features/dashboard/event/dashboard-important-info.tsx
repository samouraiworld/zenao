"use client";

import Link from "next/link";
import { EventInfo, EventPrivacy } from "@/app/gen/zenao/v1/zenao_pb";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";

interface DashboardImportantInfoProps {
  eventId: string;
  eventInfo: EventInfo;
}

function EventGuardedInfoCard({
  eventId,
  eventPrivacy,
}: {
  eventId: string;
  eventPrivacy?: EventPrivacy;
}) {
  if (!eventPrivacy) {
    return null;
  }

  if ((eventPrivacy.eventPrivacy.case ?? "public") === "guarded") {
    return (
      <Card className="flex flex-col md:flex-row md:justify-between items-center">
        <Text>The registration to this event is restricted by a password</Text>
        <Link href={`/dashboard/event/${eventId}/edit`}>
          <Button variant="link" className="text-main">
            Update restrictions
          </Button>
        </Link>
      </Card>
    );
  }
}

function EventVisibilityInfoCard({
  eventId,
  discoverable,
}: {
  eventId: string;
  discoverable: boolean;
}) {
  return (
    <Card className="flex flex-col md:flex-row md:justify-between items-center">
      <Text>
        {!discoverable
          ? "This event is not publicly visible by anyone"
          : "This event is visible by anyone"}
      </Text>
      <Link href={`/dashboard/event/${eventId}/edit`}>
        <Button variant="link" className="text-main">
          {" "}
          Change visibility
        </Button>
      </Link>
    </Card>
  );
}

export default function DashboardImportantInfo({
  eventId,
  eventInfo,
}: DashboardImportantInfoProps) {
  return (
    <div className="flex flex-col gap-2">
      <EventVisibilityInfoCard
        eventId={eventId}
        discoverable={eventInfo.discoverable}
      />
      <EventGuardedInfoCard
        eventId={eventId}
        eventPrivacy={eventInfo.privacy}
      />
    </div>
  );
}

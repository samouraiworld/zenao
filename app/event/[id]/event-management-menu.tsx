"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/cards/card";
import Text from "@/components/texts/text";
import { EventUserRole } from "@/lib/queries/event-users";
import { BroadcastEmailDialog } from "@/components/dialogs/broadcast-email-dialog";

type EventManagementMenuProps = {
  eventId: string;
  roles: EventUserRole[];
  nbParticipants: number;
};

export function EventManagementMenu({
  eventId,
  roles,
  nbParticipants,
}: EventManagementMenuProps) {
  const t = useTranslations("event");
  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isGatekeeper = useMemo(() => roles.includes("gatekeeper"), [roles]);

  const [broadcastEmailDialogOpen, setBroadcastEmailDialogOpen] =
    useState(false);

  return (
    isOrganizer && (
      <>
        <BroadcastEmailDialog
          eventId={eventId}
          nbParticipants={nbParticipants}
          open={broadcastEmailDialogOpen}
          onOpenChange={setBroadcastEmailDialogOpen}
        />

        <Card className="flex flex-col gap-2">
          <Text>{t("manage-event")}</Text>

          <div className="flex flex-col">
            {isOrganizer && (
              <>
                <Link href={`/edit/${eventId}`} className="text-main underline">
                  {t("edit-button")}
                </Link>
                <p
                  className="text-main underline cursor-pointer"
                  onClick={() => setBroadcastEmailDialogOpen(true)}
                >
                  {t("send-global-message")}
                </p>
              </>
            )}

            {(isOrganizer || isGatekeeper) && (
              <Link
                href={`/event/${eventId}/scanner`}
                className="text-main underline"
              >
                {t("gatekeeper-button")}
              </Link>
            )}
          </div>
        </Card>
      </>
    )
  );
}

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import { EventUserRole } from "@/lib/queries/event-users";
import { BroadcastEmailDialog } from "@/components/dialogs/broadcast-email-dialog";
import { zenaoClient } from "@/lib/zenao-client";

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
  const { getToken } = useAuth();
  const t = useTranslations("event");
  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isGatekeeper = useMemo(() => roles.includes("gatekeeper"), [roles]);

  const [broadcastEmailDialogOpen, setBroadcastEmailDialogOpen] =
    useState(false);

  const onDownloadParticipantList = async () => {
    const token = await getToken();
    const response = await zenaoClient.exportParticipants(
      { eventId: eventId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const blob = new Blob([response.content], { type: response.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = response.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOrganizer && !isGatekeeper) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-2">
      <Text>{t("manage-event")}</Text>

      {isOrganizer && (
        <BroadcastEmailDialog
          eventId={eventId}
          nbParticipants={nbParticipants}
          open={broadcastEmailDialogOpen}
          onOpenChange={setBroadcastEmailDialogOpen}
        />
      )}

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
            <div className="flex items-center gap-1" role="group">
              <p
                className="text-main underline cursor-pointer"
                onClick={onDownloadParticipantList}
              >
                {t("export-participant-list")}
              </p>
              <Download className="text-main" size={16} />
            </div>
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
  );
}

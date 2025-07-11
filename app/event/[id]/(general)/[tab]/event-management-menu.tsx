"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Download } from "lucide-react";
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

const getRoleLevel = (roles: EventUserRole[]) => {
  if (roles.includes("organizer")) return 2;
  if (roles.includes("gatekeeper")) return 1;
  return 0;
};

function EventManagementMenuOrganizer({
  eventId,
  onDownloadParticipantList,
  nbParticipants,
}: {
  eventId: string;
  onDownloadParticipantList: () => void;
  nbParticipants: number;
}) {
  const t = useTranslations("event");
  const [broadcastEmailDialogOpen, setBroadcastEmailDialogOpen] =
    useState(false);

  return (
    <>
      {" "}
      <BroadcastEmailDialog
        eventId={eventId}
        nbParticipants={nbParticipants}
        open={broadcastEmailDialogOpen}
        onOpenChange={setBroadcastEmailDialogOpen}
      />
      <div className="flex flex-col">
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
      </div>
    </>
  );
}

export function EventManagementMenu({
  eventId,
  roles,
  nbParticipants,
}: EventManagementMenuProps) {
  const { getToken } = useAuth();
  const t = useTranslations("event");

  const roleLevel = useMemo(() => getRoleLevel(roles), [roles]);

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

  if (roleLevel === 0) {
    return null; // No management options for users without roles
  }

  return (
    <Card className="flex flex-col gap-2">
      <Text>{t("manage-event")}</Text>

      <div className="flex flex-col">
        {roleLevel >= 2 && (
          <EventManagementMenuOrganizer
            eventId={eventId}
            onDownloadParticipantList={onDownloadParticipantList}
            nbParticipants={nbParticipants}
          />
        )}
        {roleLevel >= 1 && (
          <div className="flex flex-col">
            <Link
              href={`/event/${eventId}/scanner`}
              className="text-main underline"
            >
              {t("gatekeeper-button")}
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BroadcastEmailDialog } from "@/components/dialogs/broadcast-email-dialog";
import { CancelEventDialog } from "@/components/dialogs/cancel-event";
import { GatekeeperManagementDialog } from "@/components/dialogs/gatekeeper-management-dialog";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import { EventUserRole, eventUserRoles } from "@/lib/queries/event-users";
import { userInfoOptions } from "@/lib/queries/user";
import { zenaoClient } from "@/lib/zenao-client";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";

type EventManagementMenuProps = {
  eventId: string;
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
  const { getToken } = useAuth();
  const t = useTranslations("event");
  const [broadcastEmailDialogOpen, setBroadcastEmailDialogOpen] =
    useState(false);
  const [manageGatekeepersDialogOpen, setManageGatekeepersDialogOpen] =
    useState(false);
  const [cancelEventDialogOpen, setCancelEventDialogOpen] = useState(false);

  const { data: eventInfo } = useSuspenseQuery(eventOptions(eventId));
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );

  return (
    <>
      <BroadcastEmailDialog
        eventId={eventId}
        nbParticipants={nbParticipants}
        open={broadcastEmailDialogOpen}
        onOpenChange={setBroadcastEmailDialogOpen}
      />

      <GatekeeperManagementDialog
        eventId={eventId}
        eventInfo={eventInfo}
        gatekeepers={gatekeepers.gatekeepers}
        open={manageGatekeepersDialogOpen}
        onOpenChange={setManageGatekeepersDialogOpen}
      />

      <CancelEventDialog
        eventId={eventId}
        open={cancelEventDialogOpen}
        onOpenChange={setCancelEventDialogOpen}
      />

      <div className="flex flex-col">
        <Link href={`/event/${eventId}/edit`} className="text-main underline">
          {t("edit-button")}
        </Link>

        <p
          className="text-main underline cursor-pointer"
          onClick={() => setCancelEventDialogOpen(true)}
        >
          {t("cancel-event-button")}
        </p>

        <p
          className="text-main underline cursor-pointer"
          onClick={() => setManageGatekeepersDialogOpen(true)}
        >
          {t("manage-gatekeepers-button")} ({gatekeepers.gatekeepers.length + 1}
          )
        </p>

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

export default function EventManagementMenu({
  eventId,
  nbParticipants,
}: EventManagementMenuProps) {
  const { userId, getToken } = useAuth();
  const t = useTranslations("event");

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.userId),
  );

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

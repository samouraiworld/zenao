import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import ConfirmationDialog from "./confirmation-dialog";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { useEditEvent } from "@/lib/mutations/event-management";
import { EventFormSchemaType } from "@/types/schemas";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { makeLocationFromEvent } from "@/lib/location";
import { eventGatekeepersEmails } from "@/lib/queries/event";

type ToggleDiscoverableDialogProps = {
  eventId: string;
  eventInfo: EventInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleDiscoverableDialog({
  eventId,
  eventInfo,
  open,
  onOpenChange,
}: ToggleDiscoverableDialogProps) {
  const t = useTranslations("toggle-discoverable-dialog");
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );
  const location = makeLocationFromEvent(eventInfo.location);

  const defaultValues: EventFormSchemaType = {
    ...eventInfo,
    location,
    gatekeepers: gatekeepers.gatekeepers.map((gatekeeperEmail) => ({
      email: gatekeeperEmail,
    })),
    exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
    password: "",
    discoverable: !eventInfo.discoverable,
  };

  const { editEvent, isPending } = useEditEvent(getToken);

  const onSubmit = async () => {
    try {
      await editEvent({ ...defaultValues, eventId });
      toast({
        title: t("toast-toggle-discoverable-success", {
          discoverable: defaultValues.discoverable
            ? "discoverable"
            : "undiscoverable",
        }),
      });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-toggle-discoverable-error", {
          discoverable: defaultValues.discoverable
            ? "discoverable"
            : "undiscoverable",
        }),
      });
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title", {
        discoverable: eventInfo.discoverable
          ? "undiscoverable"
          : "discoverable",
      })}
      description={t("desc", {
        visible: eventInfo.discoverable ? "hidden" : "visible",
      })}
      confirmText={t("confirm")}
      cancelText={t("go-back")}
      onConfirm={onSubmit}
      isPending={isPending}
      confirmButtonAriaLabel="make event discoverable"
    />
  );
}

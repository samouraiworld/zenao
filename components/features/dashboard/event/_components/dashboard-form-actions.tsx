import { CircleX, Eye, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { useMemo, useState } from "react";
import { fromUnixTime } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import { useDashboardEventEditionContext } from "@/components/providers/dashboard-event-edition-context-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventFormSchemaType } from "@/types/schemas";
import { CancelEventDialog } from "@/components/dialogs/cancel-event";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";

export default function DashboardFormActions() {
  const {
    eventId,
    eventInfo: { startDate },
  } = useDashboardEventContext();
  const { isSubmittable, isUpdating, save } = useDashboardEventEditionContext();
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("dashboard.eventDetails.header");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  const hasStarted = useMemo(() => {
    return fromUnixTime(Number(startDate) / 1000) < new Date();
  }, [startDate]);

  if (isMobile) {
    return (
      <>
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" disabled={isUpdating}>
            <CircleX />
            {t("cancel")}
          </Button>

          <Button type="button" variant="outline" asChild>
            <Link href={`/event/${eventId}`} target="_blank">
              <Eye />
              {t("seeAsCustomer")}
            </Link>
          </Button>
        </div>

        <div className="w-full fixed bottom-0 flex flex-col py-4 bg-muted z-50">
          <div className="flex mx-auto">
            <form onSubmit={form.handleSubmit(save)}>
              <Button
                type="submit"
                disabled={!isSubmittable || isUpdating}
                className="w-fit"
              >
                <Save />
                {t("saveChanges")}
              </Button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CancelEventDialog
        eventId={eventId}
        onOpenChange={setIsCancelDialogOpen}
        open={isCancelDialogOpen}
      />
      <div className="flex flex-wrap-reverse h-fit gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isUpdating || hasStarted}
          onClick={() => setIsCancelDialogOpen(true)}
        >
          <CircleX />
          {t("cancel")}
        </Button>

        <Button type="button" variant="outline" asChild>
          <Link href={`/event/${eventId}`} target="_blank">
            <Eye />
            {t("seeAsCustomer")}
          </Link>
        </Button>
      </div>
    </>
  );
}

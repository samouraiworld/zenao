import { CircleX, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/shadcn/button";
import { useDashboardEventEditionContext } from "@/components/providers/dashboard-event-edition-context-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventFormSchemaType } from "@/types/schemas";

export default function DashboardFormActions() {
  const { isSubmittable, isUpdating, save } = useDashboardEventEditionContext();
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("dashboard.eventDetails.header");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" disabled={isUpdating}>
            <CircleX />
            {t("cancel")}
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
    <div className="flex gap-4 justify-end">
      <form onSubmit={form.handleSubmit(save)}>
        <Button type="submit" disabled={!isSubmittable || isUpdating}>
          <Save />
          {t("saveChanges")}
        </Button>
      </form>
      <Button type="button" variant="outline" disabled={isUpdating}>
        <CircleX />
        {t("cancel")}
      </Button>
    </div>
  );
}

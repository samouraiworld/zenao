"use client";

import { Save } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import DashboardFormDescription from "@/components/features/dashboard/event/_components/dashboard-form-description";
import DashboardEventInfo from "@/components/features/dashboard/event/dashboard-event-info";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";
import { Button } from "@/components/shadcn/button";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";
import { EventFormSchemaType } from "@/types/schemas";
import { useDashboardEventEditionContext } from "@/components/providers/dashboard-event-edition-context-provider";

export default function DashboardEventGeneral() {
  const t = useTranslations("dashboard.eventDetails.header");
  const { eventInfo, roles } = useDashboardEventContext();
  const form = useFormContext<EventFormSchemaType>();
  const { isSubmittable, isUpdating, save } = useDashboardEventEditionContext();

  return (
    <RoleBasedViewMode
      roles={roles}
      allowedRoles={["organizer"]}
      fallback={<MarkdownPreview markdownString={eventInfo.description} />}
    >
      <DashboardEventInfo />
      <div className="my-10" />

      <DashboardFormDescription />

      <div className="my-10" />

      <form onSubmit={form.handleSubmit(save)}>
        <Button
          type="submit"
          disabled={!isSubmittable || isUpdating}
          className="w-full"
        >
          <Save />
          {t("saveChanges")}
        </Button>
      </form>
    </RoleBasedViewMode>
  );
}

"use client";

import DashboardFormDescription from "@/components/features/dashboard/event/_components/dashboard-form-description";
import { useDashboardEventEditionContext } from "@/components/providers/dashboard-event-edition-context-provider";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import RoleBasedEditViewMode from "@/components/widgets/permissions/edit-view-mode";

export default function DashboardEventDescription() {
  const { eventInfo, roles } = useDashboardEventEditionContext();

  return (
    <RoleBasedEditViewMode
      roles={roles}
      allowedRoles={["organizer"]}
      edit={<DashboardFormDescription />}
      view={<MarkdownPreview markdownString={eventInfo.description} />}
    />
  );
}

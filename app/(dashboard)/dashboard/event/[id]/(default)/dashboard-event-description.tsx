"use client";

import DashboardFormDescription from "@/components/features/dashboard/event/_components/dashboard-form-description";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import RoleBasedEditViewMode from "@/components/widgets/permissions/edit-view-mode";

export default function DashboardEventDescription() {
  const { eventInfo, roles } = useDashboardEventContext();

  return (
    <RoleBasedEditViewMode
      roles={roles}
      allowedRoles={["organizer"]}
      edit={<DashboardFormDescription />}
      view={<MarkdownPreview markdownString={eventInfo.description} />}
    />
  );
}

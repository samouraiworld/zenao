"use client";

import DashboardFormDescription from "@/components/features/dashboard/event/_components/dashboard-form-description";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";

export default function DashboardEventDescription() {
  const { eventInfo, roles } = useDashboardEventContext();

  return (
    <RoleBasedViewMode
      roles={roles}
      allowedRoles={["organizer"]}
      fallback={<MarkdownPreview markdownString={eventInfo.description} />}
    >
      <DashboardFormDescription />
    </RoleBasedViewMode>
  );
}

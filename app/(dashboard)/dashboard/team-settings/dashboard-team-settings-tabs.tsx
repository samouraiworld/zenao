"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Separator } from "@/components/shadcn/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";

export default function DaashboardTeamSettingsTabs({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard.teamSettings.tabs");
  const { roles } = useDashboardTeamSettingsEditionContext();
  const section = useSelectedLayoutSegment() || "members";

  return (
    <Tabs value={section} className="w-full min-h-[300px]">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/dashboard/team-settings`} scroll={false}>
          <TabsTrigger
            value="members"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("members")}
          </TabsTrigger>
        </Link>
        <RoleBasedViewMode roles={roles} allowedRoles={["owner"]}>
          <Link href={`/dashboard/team-settings/permissions`} scroll={false}>
            <TabsTrigger
              value="permissions"
              className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
            >
              {t("permissions")}
            </TabsTrigger>
          </Link>
        </RoleBasedViewMode>
      </TabsList>
      <Separator className="mb-3" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          <TabsContent value={section}>{children}</TabsContent>
        </div>
      </div>
    </Tabs>
  );
}

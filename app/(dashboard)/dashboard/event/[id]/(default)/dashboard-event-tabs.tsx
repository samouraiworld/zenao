"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TabsContent } from "@/components/shadcn/tabs";
import { Separator } from "@/components/shadcn/separator";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";
import { EventUserRole } from "@/lib/queries/event-users";
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";
import RoleLockTabsTrigger from "@/components/widgets/tabs/lock-tabs-trigger";
import { userInfoOptions } from "@/lib/queries/user";
import { planSchema } from "@/types/schemas";

export default function DashboardEventTabs({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: EventUserRole[];
}) {
  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );

  const result = planSchema.safeParse(userInfo?.plan || "free");
  const plan = result.success ? result.data : "free";

  const t = useTranslations("dashboard.eventDetails.eventTabs");
  const { eventId } = useDashboardEventContext();
  const section = useSelectedLayoutSegment() || "general";

  return (
    <Tabs value={section} className="w-full min-h-[300px]">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/dashboard/event/${eventId}`} scroll={false}>
          <TabsTrigger
            value="general"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("general")}
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/event/${eventId}/participants`} scroll={false}>
          <TabsTrigger
            value="participants"
            className="w-fit flex gap-2 p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("participants")}
          </TabsTrigger>
        </Link>

        <RoleBasedViewMode roles={roles} allowedRoles={["organizer"]}>
          <Link href={`/dashboard/event/${eventId}/gatekeepers`} scroll={false}>
            <TabsTrigger
              value="gatekeepers"
              className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
            >
              {t("gatekeepers")}
            </TabsTrigger>
          </Link>
        </RoleBasedViewMode>

        <RoleBasedViewMode roles={roles} allowedRoles={["organizer"]}>
          <RoleLockTabsTrigger
            allowedRoles={["pro"]}
            roles={[plan]}
            value="broadcast"
          >
            <Link href={`/dashboard/event/${eventId}/broadcast`} scroll={false}>
              {t("broadcast")}
            </Link>
          </RoleLockTabsTrigger>
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

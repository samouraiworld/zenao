"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { NavUser } from "./nav-user";
import { userInfoOptions } from "@/lib/queries/user";
import { profileOptions } from "@/lib/queries/profile";

import { SidebarFooter } from "@/components/shadcn/sidebar";

export default function AppSidebarFooter() {
  const { getToken, userId } = useAuth();
  const { data: user } = useSuspenseQuery(userInfoOptions(getToken, userId));
  const { data: profile } = useSuspenseQuery(
    profileOptions(user?.userId || ""),
  );

  if (!user || !profile) {
    return null;
  }

  return (
    <SidebarFooter>
      <NavUser
        user={profile}
        userId={user?.userId ?? ""}
        plan={user?.plan ?? "free"}
      />
    </SidebarFooter>
  );
}

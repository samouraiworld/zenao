// lib/auth/withRoleRestrictions.tsx
import "server-only";
import { redirect, notFound } from "next/navigation";
import React from "react";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getQueryClient } from "../get-query-client";
import { EventUserRole, eventUserRoles } from "../queries/event-users";
import { userInfoOptions } from "../queries/user";
import { communityUserRoles } from "../queries/community";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { CommunityUserRole } from "@/types/schemas";

type ServerComponent<P> = (
  props: P,
) => Promise<React.ReactNode> | React.ReactNode;

export function withEventRoleRestrictions<
  P extends {
    params: Promise<{ id: string }>;
  },
>(
  Component: ServerComponent<P>,
  allowedRoles: EventUserRole[],
  options?: {
    redirectTo?: string;
    notFoundOnFail?: boolean;
  },
): ServerComponent<P> {
  return async function RoleProtectedPage(props: P) {
    const { id: eventId } = await props.params;
    const queryClient = getQueryClient();
    const { getToken, userId } = await auth();
    const token = await getToken();

    const userAddrOpts = userInfoOptions(getToken, userId);
    const userInfo = await queryClient.fetchQuery(userAddrOpts);
    const userProfileId = userInfo?.userId;

    const t = await getTranslations();

    if (!token || !userProfileId) {
      return (
        <ScreenContainerCentered isSignedOutModal>
          {t("eventForm.log-in")}
        </ScreenContainerCentered>
      );
    }

    const roles = await queryClient.fetchQuery(
      eventUserRoles(eventId, userProfileId),
    );

    if (!allowedRoles.some((role) => roles.includes(role))) {
      if (options?.notFoundOnFail) {
        notFound();
      }

      redirect(options?.redirectTo ?? "/unauthorized");
    }

    return <Component {...props} />;
  };
}

export function withCommunityRolesRestriction<
  P extends {
    params: Promise<{ id: string }>;
  },
>(
  Component: ServerComponent<P>,
  allowedRoles: CommunityUserRole[],
): ServerComponent<P> {
  return async function RoleProtectedPage(props: P) {
    const { id: communityId } = await props.params;
    const queryClient = getQueryClient();
    const { getToken, userId } = await auth();
    const token = await getToken();

    const userAddrOpts = userInfoOptions(getToken, userId);
    const userInfo = await queryClient.fetchQuery(userAddrOpts);
    const userProfileId = userInfo?.userId;

    const t = await getTranslations();

    if (!token || !userProfileId) {
      return (
        <ScreenContainerCentered isSignedOutModal>
          {t("communityForm.log-in")}
        </ScreenContainerCentered>
      );
    }

    const roles = await queryClient.fetchQuery(
      communityUserRoles(communityId, userProfileId),
    );

    if (!allowedRoles.some((role) => roles.includes(role))) {
      notFound();
    }

    return <Component {...props} />;
  };
}

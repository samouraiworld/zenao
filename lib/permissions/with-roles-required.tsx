// lib/auth/withRoleRestrictions.tsx
import "server-only";
import { redirect, notFound } from "next/navigation";
import React from "react";
import { getTranslations } from "next-intl/server";
import { getQueryClient } from "../get-query-client";
import { EventUserRole, eventUserRoles } from "../queries/event-users";
import { communityUserRoles } from "../queries/community";
import getActor from "../utils/actor";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { CommunityUserRole, PlanType } from "@/types/schemas";
import UpgradePlan from "@/components/features/dashboard/upgrade-plan";

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
    const actor = await getActor();

    const t = await getTranslations();

    if (!actor) {
      return (
        <ScreenContainerCentered isSignedOutModal>
          {t("eventForm.log-in")}
        </ScreenContainerCentered>
      );
    }

    const roles = await queryClient.fetchQuery(
      eventUserRoles(eventId, actor.actingAs),
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
    const actor = await getActor();

    const t = await getTranslations();

    if (!actor) {
      return (
        <ScreenContainerCentered isSignedOutModal>
          {t("communityForm.log-in")}
        </ScreenContainerCentered>
      );
    }

    const roles = await queryClient.fetchQuery(
      communityUserRoles(communityId, actor.actingAs),
    );

    if (!allowedRoles.some((role) => roles.includes(role))) {
      notFound();
    }

    return <Component {...props} />;
  };
}

export function withPlanRestriction<P extends object>(
  Component: ServerComponent<P>,
  allowedPlans: PlanType[],
): ServerComponent<P> {
  return async function PlanProtectedPage(props: P) {
    const t = await getTranslations();
    const actor = await getActor();

    if (!actor) {
      return (
        <ScreenContainerCentered isSignedOutModal>
          {t("communityForm.log-in")}
        </ScreenContainerCentered>
      );
    }

    if (!allowedPlans.includes(actor.plan ?? "free")) {
      return (
        <ScreenContainerCentered>
          <UpgradePlan currentPlan={actor.plan || "free"} />
        </ScreenContainerCentered>
      );
    }

    return <Component {...props} />;
  };
}

"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useStartCommunityStripeOnboarding } from "@/lib/mutations/stripe-onboarding";
import { captureException } from "@/lib/report";
import {
  communityPayoutStatus,
  communityUserRoles,
} from "@/lib/queries/community";
import { userInfoOptions } from "@/lib/queries/user";
import SettingsSection from "@/components/layout/settings-section";
import { Card } from "@/components/widgets/cards/card";
import Heading from "@/components/widgets/texts/heading";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { DateTimeText } from "@/components/widgets/date-time-text";
import { useDashboardCommunityContext } from "@/components/providers/dashboard-community-context-provider";

const payoutStatusBadge = {
  verified: "secondary",
  failed: "destructive",
  pending: "outline",
  unknown: "outline",
} as const;

export type PayoutStatus = keyof typeof payoutStatusBadge;

export default function PayoutsConfiguration() {
  const { communityId } = useDashboardCommunityContext();
  const { getToken, userId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledStripeParams = useRef(false);
  const t = useTranslations("community-form");
  const tEdit = useTranslations("community-edit-form");

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userInfo?.userId || ""),
  );
  const isAdmin = userRoles.includes("administrator");

  const { data: payoutStatus, isLoading: isPayoutStatusLoading } = useQuery({
    ...communityPayoutStatus(communityId, getToken),
    enabled: isAdmin,
  });
  const {
    mutateAsync: startCommunityStripeOnboarding,
    isPending: isStripeOnboardingPending,
  } = useStartCommunityStripeOnboarding();

  useEffect(() => {
    if (handledStripeParams.current) return;
    const stripeParam = searchParams.get("stripe");
    if (!stripeParam) return;

    handledStripeParams.current = true;
    if (stripeParam === "return") {
      toast({
        title: tEdit("stripe-onboarding-return"),
        variant: "default",
      });
    } else if (stripeParam === "refresh") {
      toast({
        variant: "destructive",
        title: tEdit("stripe-onboarding-refresh"),
      });
    }
    router.replace(pathname);
  }, [pathname, router, searchParams, tEdit, toast]);

  const handleStartCommunityStripeOnboarding = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const returnPath = `/dashboard/community/${communityId}/payouts?stripe=return`;
      const refreshPath = `/dashboard/community/${communityId}/payouts?stripe=refresh`;

      const onboardingUrl = await startCommunityStripeOnboarding({
        token,
        communityId,
        returnPath,
        refreshPath,
      });

      if (!onboardingUrl) {
        throw new Error("missing onboarding url");
      }

      window.location.href = onboardingUrl;
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: tEdit("stripe-onboarding-failure"),
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  const statusMissingAccount = "missing_account";
  const lastVerifiedAtSeconds = payoutStatus?.lastVerifiedAt
    ? Number(payoutStatus.lastVerifiedAt)
    : 0;
  const hasLastVerifiedAt =
    payoutStatus?.lastVerifiedAt != null && lastVerifiedAtSeconds > 0;
  const isOnboardingComplete =
    payoutStatus?.onboardingState === "completed" ||
    payoutStatus?.verificationState === "verified";
  const isMissingStripeAccountId =
    isOnboardingComplete && !payoutStatus?.platformAccountId;
  const isStripeAccountMissingError =
    payoutStatus?.verificationState === statusMissingAccount;
  const shouldShowRefreshError =
    !!payoutStatus?.refreshError && !isStripeAccountMissingError;
  const payoutStatusLabel = (payoutStatus?.verificationState ??
    "unknown") as PayoutStatus;
  const payoutStatusText: Record<PayoutStatus, string> = {
    verified: t("payout-status-verified"),
    failed: t("payout-status-failed"),
    pending: t("payout-status-pending"),
    unknown: t("payout-status-unknown"),
  };
  const payoutStatusKey = payoutStatusText[payoutStatusLabel ?? ""]
    ? payoutStatusLabel
    : "unknown";

  return (
    <SettingsSection
      title={t("payments-section")}
      description={t("payments-description")}
    >
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <Heading level={4}>{t("stripe-connect-label")}</Heading>
          <p className="text-sm text-muted-foreground">
            {t("stripe-connect-description")}
          </p>
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <Heading level={5}>{t("payout-status-label")}</Heading>
              {isPayoutStatusLoading || payoutStatusKey === undefined ? (
                <Badge variant="outline">{t("payout-status-loading")}</Badge>
              ) : (
                <Badge
                  variant={
                    payoutStatusBadge[payoutStatusKey as PayoutStatus] ??
                    "outline"
                  }
                >
                  {payoutStatusText[payoutStatusKey]}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground pt-2">
              <span>{t("payout-status-last-checked")}</span>
              {hasLastVerifiedAt ? (
                <DateTimeText datetime={lastVerifiedAtSeconds} />
              ) : (
                <span>{t("payout-status-never")}</span>
              )}
              {payoutStatus?.isStale && <span>{t("payout-status-stale")}</span>}
              {shouldShowRefreshError && (
                <span>{t("payout-status-refresh-error")}</span>
              )}
              {(isMissingStripeAccountId || isStripeAccountMissingError) && (
                <span>{t("stripe-dashboard-missing-account")}</span>
              )}
            </div>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => {
                if (isOnboardingComplete) {
                  window.open(
                    process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL,
                    "_blank",
                  );
                  return;
                }
                void handleStartCommunityStripeOnboarding();
              }}
              disabled={
                isStripeOnboardingPending ||
                isPayoutStatusLoading ||
                isMissingStripeAccountId
              }
            >
              {isOnboardingComplete
                ? t("stripe-dashboard-cta")
                : t("stripe-connect-cta")}
            </Button>
          </div>
        </div>
      </Card>
    </SettingsSection>
  );
}

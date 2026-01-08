"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { useStartCommunityStripeOnboarding } from "@/lib/mutations/stripe-onboarding";
import { captureException } from "@/lib/report";
import {
  communityAdministrators,
  communityInfo,
  communityUserRoles,
} from "@/lib/queries/community";
import { CommunityForm } from "@/components/features/community/community-form";
import {
  CommunityDetails,
  communityDetailsSchema,
  communityFormSchema,
  CommunityFormSchemaType,
} from "@/types/schemas";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { userInfoOptions } from "@/lib/queries/user";

interface EditCommunityFormProps {
  communityId: string;
}

export const EditCommunityForm = ({ communityId }: EditCommunityFormProps) => {
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const handledStripeParams = useRef(false);
  const { data: communityData } = useSuspenseQuery(communityInfo(communityId));

  const { data: adminEmails } = useSuspenseQuery(
    communityAdministrators(communityId, getToken),
  );
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userInfo?.userId || ""),
  );
  const isAdmin = userRoles.includes("administrator");

  const communityDetails = deserializeWithFrontMatter({
    serialized: communityData.description || "",
    schema: communityDetailsSchema,
    defaultValue: {
      description: communityData.description || "",
      shortDescription: "",
      portfolio: [],
      socialMediaLinks: [],
    },
    contentFieldName: "description",
  });

  const defaultValues: CommunityFormSchemaType = {
    displayName: communityData.displayName ?? "",
    description: communityDetails.description,
    shortDescription: communityDetails.shortDescription,
    avatarUri: communityData.avatarUri ?? "",
    bannerUri: communityData.bannerUri ?? "",
    administrators: (adminEmails ?? []).map((email) => ({ email })),
    socialMediaLinks: communityDetails.socialMediaLinks,
  };

  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(communityFormSchema),
    defaultValues,
  });

  const { mutateAsync: editCommunity, isPending } = useEditCommunity();
  const {
    mutateAsync: startCommunityStripeOnboarding,
    isPending: isStripeOnboardingPending,
  } = useStartCommunityStripeOnboarding();
  const t = useTranslations("community-edit-form");

  useEffect(() => {
    if (handledStripeParams.current) return;
    const stripeParam = searchParams.get("stripe");
    if (!stripeParam) return;

    handledStripeParams.current = true;
    if (stripeParam === "return") {
      toast({
        title: t("stripe-onboarding-return"),
        variant: "default",
      });
    } else if (stripeParam === "refresh") {
      toast({
        variant: "destructive",
        title: t("stripe-onboarding-refresh"),
      });
    }
    router.replace(pathname);
  }, [pathname, router, searchParams, t, toast]);

  const handleStartCommunityStripeOnboarding = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const returnPath = `/community/${communityId}/edit?stripe=return`;
      const refreshPath = `/community/${communityId}/edit?stripe=refresh`;

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
        title: t("stripe-onboarding-failure"),
      });
    }
  };

  const onSubmit = async (values: CommunityFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(values.description, {
        shortDescription: values.shortDescription,
        portfolio: communityDetails.portfolio,
        socialMediaLinks: values.socialMediaLinks,
      });

      await editCommunity({
        token,
        communityId,
        displayName: values.displayName,
        description: description,
        avatarUri: values.avatarUri,
        bannerUri: values.bannerUri,
        administrators: values.administrators.map((a) => a.email),
      });
      trackEvent("CommunityEdited", {
        props: {
          communityId,
        },
      });

      toast({ title: t("update-success") });
      router.push(`/community/${communityId}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("update-failure"),
      });
    }
  };

  return (
    <CommunityForm
      form={form}
      onSubmit={onSubmit}
      isLoading={isPending}
      isEditing
      stripeOnboarding={
        isAdmin
          ? {
              onStart: handleStartCommunityStripeOnboarding,
              isLoading: isStripeOnboardingPending,
            }
          : undefined
      }
    />
  );
};

"use client";

import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import z from "zod";
import {
  CommunityDetails,
  communityFormSchema,
  CommunityFormSchemaType,
} from "@/types/schemas";
import { CommunityForm } from "@/components/features/community/community-form";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { serializeWithFrontMatter } from "@/lib/serialization";
import { useCreateCommunity } from "@/lib/mutations/community-create";
import { userInfoOptions } from "@/lib/queries/user";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

export default function CreateCommunityForm() {
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvents();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const t = useTranslations("community-create-form");
  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      communityFormSchema.extend({
        administrators: z.array(
          z.object({
            address: z
              .string()
              .email("Administrator must be a valid email address"),
          }),
        ),
      }),
    ),
    defaultValues: {
      displayName: "",
      avatarUri: "",
      bannerUri: "",
      description: "",
      shortDescription: "",
      socialMediaLinks: [],
      administrators: [],
    },
  });

  const { createCommunity, isPending } = useCreateCommunity();

  const onSubmit = async (data: CommunityFormSchemaType) => {
    try {
      const token = await getToken();

      if (!token || !userId || !userInfo?.userId) {
        throw new Error("User is not authenticated");
      }

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(data.description, {
        shortDescription: data.shortDescription,
        portfolio: [],
        socialMediaLinks: data.socialMediaLinks,
      });

      const communityId = await createCommunity({
        token,
        userId: userInfo?.userId,
        displayName: data.displayName,
        avatarUri: data.avatarUri,
        bannerUri: data.bannerUri,
        description,
        administrators: data.administrators.map((admin) => admin.email),
      });

      trackEvent("CommunityCreated", {
        props: {
          communityId,
        },
      });

      form.reset();
      toast({
        title: t("toast-creation-success"),
      });

      router.push(`/community/${communityId}`, { scroll: false });
    } catch (error) {
      captureException(error);
      toast({
        variant: "destructive",
        title: t("toast-creation-failure"),
      });
    }
  };

  return (
    <CommunityForm form={form} onSubmit={onSubmit} isLoading={isPending} />
  );
}

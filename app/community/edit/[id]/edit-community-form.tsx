"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";
import { communityInfo } from "@/lib/queries/community";
import { CommunityForm } from "@/components/features/community/community-form";
import {
  CommunityDetails,
  communityDetailsSchema,
  communityFormSchema,
  CommunityFormSchemaType,
} from "@/types/schemas";
import { zenaoClient } from "@/lib/zenao-client";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";

interface EditCommunityFormProps {
  communityId: string;
}

export const EditCommunityForm = ({ communityId }: EditCommunityFormProps) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { data: communityData } = useSuspenseQuery(communityInfo(communityId));

  const { data: adminAddresses } = useSuspenseQuery({
    queryKey: ["communityAdmins", communityId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");
      const res = await zenaoClient.getCommunityAdministrators(
        { communityId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.administrators;
    },
  });

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
    administrators: (adminAddresses ?? []).map((address) => ({ address })),
    socialMediaLinks: communityDetails.socialMediaLinks,
  };

  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(communityFormSchema),
    defaultValues,
  });

  const { mutateAsync: editCommunity, isPending } = useEditCommunity();
  const t = useTranslations("community-edit-form");

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
        administrators: values.administrators.map((a) => a.address),
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
    <CommunityForm form={form} onSubmit={onSubmit} isLoading={isPending} />
  );
};

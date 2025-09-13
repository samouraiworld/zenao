"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";
import { communityInfo, communityAdministrators } from "@/lib/queries/community";
import { CommunityForm } from "@/components/features/community/community-form";
// import { useTranslations } from "next-intl";
import {
  communityFormSchema,
  CommunityFormSchemaType,
} from "@/types/schemas";

export const EditCommunityForm: React.FC<{ communityId: string }> = ({
  communityId,
}) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { data: communityData } = useSuspenseQuery(communityInfo(communityId));
  const { data: administrators } = useSuspenseQuery(
    communityAdministrators(communityId),
  );
  const defaultValues: CommunityFormSchemaType = {
    displayName: communityData.displayName ?? "",
    description: communityData.description ?? "",
    avatarUri: communityData.avatarUri ?? "",
    bannerUri: communityData.bannerUri ?? "",
    administrators: administrators.length > 0 ? administrators : [""],
  };
  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(communityFormSchema),
    defaultValues,
  });
  const { mutateAsync: editCommunity, isPending } = useEditCommunity();
  const onSubmit = async (values: CommunityFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");
      await editCommunity({
        token,
        communityId,
        ...values,
      });
      toast({ title: "Community updated successfully" });
      router.push(`/community/${communityId}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: "Failed to update community",
      });
    }
  };

  return (
    <CommunityForm
      form={form}
      onSubmit={onSubmit}
      isLoading={isPending}
      isEditing
    />
  );
};

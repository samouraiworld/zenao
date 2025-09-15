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
import { communityInfo } from "@/lib/queries/community";
import { CommunityForm } from "@/components/features/community/community-form";
import { communityFormSchema, CommunityFormSchemaType } from "@/types/schemas";
import { zenaoClient } from "@/lib/zenao-client";
// TODO: useTranslations

export const EditCommunityForm: React.FC<{ communityId: string }> = ({
  communityId,
}) => {
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

  const defaultValues: CommunityFormSchemaType = {
    displayName: communityData?.displayName ?? "",
    description: communityData?.description ?? "",
    avatarUri: communityData?.avatarUri ?? "",
    bannerUri: communityData?.bannerUri ?? "",
    administrators: (adminAddresses ?? []).map((address) => ({ address })),
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
        displayName: values.displayName,
        description: values.description,
        avatarUri: values.avatarUri,
        bannerUri: values.bannerUri,
        administrators: values.administrators.map((a) => a.address),
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
    <CommunityForm form={form} onSubmit={onSubmit} isLoading={isPending} />
  );
};

"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";
import { communityInfo } from "@/lib/queries/community";
import { CommunityForm } from "@/components/features/community/community-form";

// TODO: move to @/types/schemas
const communityFormSchema = z.object({
  displayName: z.string().min(3, "Name too short"),
  description: z.string().min(5, "Description too short"),
  avatarUri: z.string().url().or(z.literal("")),
  bannerUri: z.string().url().or(z.literal("")),
  administrators: z
    .array(z.string().min(1))
    .min(1, "At least one admin is required"),
});

type CommunityFormSchemaType = z.infer<typeof communityFormSchema>;

export const EditCommunityForm: React.FC<{ communityId: string }> = ({
  communityId,
}) => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { data: communityData } = useSuspenseQuery(communityInfo(communityId));

  const defaultValues: CommunityFormSchemaType = {
    displayName: communityData.displayName ?? "",
    description: communityData.description ?? "",
    avatarUri: communityData.avatarUri ?? "",
    bannerUri: communityData.bannerUri ?? "",
    administrators:
      communityData.administrators.length > 0
        ? communityData.administrators
        : userId
          ? [userId]
          : [],
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
        avatarUri: values.avatarUri || "",
        bannerUri: values.bannerUri || "",
        // TODO: admins
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

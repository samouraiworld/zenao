"use client";

import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  CommunityDetails,
  communityFormSchema,
  CommunityFormSchemaType,
} from "@/types/schemas";
import { CommunityForm } from "@/components/features/community/community-form";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { serializeWithFrontMatter } from "@/lib/serialization";

export default function CreateCommunityForm() {
  const { toast } = useToast();
  const { userId, getToken } = useAuth();

  const t = useTranslations("community-form");
  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(communityFormSchema),
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

  // const { createCommunity, isPending } = useCreateCommunity();

  const onSubmit = async (data: CommunityFormSchemaType) => {
    try {
      const token = await getToken();

      if (!token || !userId) {
        throw new Error("User is not authenticated");
      }

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(data.description, {
        shortDescription: data.shortDescription,
        portfolio: [],
        socialMediaLinks: data.socialMediaLinks,
      });

      console.log("Creating community with data:", data);

      // const communityId = await createCommunity({
      //   token,
      //   displayName: data.displayName,
      //   avatarUri: data.avatarUri,
      //   bannerUri: data.bannerUri,
      //   description,
      //   administrators: data.administrators,
      // });
    } catch (error) {
      captureException(error);
      toast({
        variant: "destructive",
        title: t("update-failure"),
      });
    }
  };

  return <CommunityForm form={form} onSubmit={onSubmit} isLoading={false} />;
}

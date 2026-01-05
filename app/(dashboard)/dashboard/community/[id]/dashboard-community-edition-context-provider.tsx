"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useDashboardCommunityContext } from "./dashboard-community-context-provider";
import { Form } from "@/components/shadcn/form";
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
import { useToast } from "@/hooks/use-toast";
import { communityAdministrators } from "@/lib/queries/community";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";

interface DashboardEventEditionContextProps {
  isUpdating: boolean;
  isSubmittable?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  save: (values: CommunityFormSchemaType) => void;
}

const DashboarCommunityEditionContext =
  createContext<DashboardEventEditionContextProps>({} as never);

interface DashboardCommunityEditionContextProps {
  children: React.ReactNode;
}

export default function DashboardCommunityEditionContextProvider({
  children,
}: DashboardCommunityEditionContextProps) {
  const { getToken } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const { communityId, communityInfo } = useDashboardCommunityContext();
  const { trackEvent } = useAnalyticsEvents();
  const { toast } = useToast();

  const { data: adminEmails } = useSuspenseQuery(
    communityAdministrators(communityId, getToken),
  );

  const communityDetails = deserializeWithFrontMatter({
    serialized: communityInfo.description || "",
    schema: communityDetailsSchema,
    defaultValue: {
      description: communityInfo.description || "",
      shortDescription: "",
      portfolio: [],
      socialMediaLinks: [],
    },
    contentFieldName: "description",
  });

  const defaultValues: CommunityFormSchemaType = {
    displayName: communityInfo.displayName ?? "",
    description: communityDetails.description,
    shortDescription: communityDetails.shortDescription,
    avatarUri: communityInfo.avatarUri ?? "",
    bannerUri: communityInfo.bannerUri ?? "",
    administrators: (adminEmails ?? []).map((email) => ({ email })),
    socialMediaLinks: communityDetails.socialMediaLinks,
  };

  const form = useForm<CommunityFormSchemaType>({
    mode: "all",
    resolver: zodResolver(communityFormSchema),
    defaultValues,
  });

  const isSubmittable = useMemo(
    () => form.formState.isValid && form.formState.isDirty,
    [form.formState.isValid, form.formState.isDirty],
  );

  const [isUpdating, startTransition] = useTransition();
  const { mutateAsync: editCommunity } = useEditCommunity();
  const t = useTranslations("community-edit-form");

  const save = (values: CommunityFormSchemaType) => {
    startTransition(async () => {
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
        form.reset(values, { keepDirty: false });
        toast({ title: t("update-success") });
      } catch (err) {
        captureException(err);
        toast({
          variant: "destructive",
          title: t("update-failure"),
        });
      }
    });
  };

  return (
    <DashboarCommunityEditionContext.Provider
      value={{
        isUpdating,
        save,
        formRef,
        isSubmittable,
      }}
    >
      <Form {...form}>{children}</Form>
    </DashboarCommunityEditionContext.Provider>
  );
}

export function useDashboardCommunityEditionContext() {
  const context = useContext(DashboarCommunityEditionContext);
  if (!context) {
    throw new Error(
      "useDashboardCommunityEditionContext must be used within a DashboardCommunityEditionContextProvider",
    );
  }
  return context;
}

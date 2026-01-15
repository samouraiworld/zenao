"use client";

import { useForm } from "react-hook-form";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTeamContext } from "./team-provider";
import { Form } from "@/components/shadcn/form";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { teamFormSchema, TeamFormSchemaType } from "@/types/schemas";
import { useEditTeam } from "@/lib/mutations/team-edit";
import { userInfoOptions } from "@/lib/queries/user";

export interface DashboardTeamSettingsEditionContextProps {
  isUpdating: boolean;
  isSubmittable?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  save: (values: TeamFormSchemaType) => void;
}

const DashboardTeamSettingsEditionContext =
  createContext<DashboardTeamSettingsEditionContextProps>({} as never);

export function useDashboardTeamSettingsEditionContext() {
  const context = useContext(DashboardTeamSettingsEditionContext);

  if (!context) {
    throw new Error(
      "useDashboardTeamSettingsEditionContext must be used within a DashboardTeamSettingsEditionProvider",
    );
  }
  return context;
}

interface DashboardTeamSettingsEditionProviderProps {
  children: React.ReactNode;
}

export default function DashboardTeamSettingsEditionProvider({
  children,
}: DashboardTeamSettingsEditionProviderProps) {
  const activeTeam = useTeamContext();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("dashboard.teamSettings");

  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );

  const userId = userInfo?.userId || "";

  const { editTeam } = useEditTeam(getToken);

  const defaultValues: TeamFormSchemaType = {
    displayName: activeTeam?.displayName || "",
    avatarUri: activeTeam?.avatarUri || "",
    bio: activeTeam?.bio || "",
  };

  const form = useForm<TeamFormSchemaType>({
    mode: "all",
    resolver: zodResolver(teamFormSchema),
    defaultValues,
  });

  const isSubmittable = useMemo(
    () => form.formState.isValid && form.formState.isDirty,
    [form.formState.isValid, form.formState.isDirty],
  );

  const [isUpdating, startTransition] = useTransition();
  const save = (values: TeamFormSchemaType) => {
    startTransition(async () => {
      try {
        // TODO fix members passing
        await editTeam({ ...values, members: [], userId });
        form.reset(values, { keepDirty: false });
        toast({
          title: t("toast-edit-success"),
        });
      } catch (err) {
        // Revert optimistic update
        captureException(err);
        toast({
          variant: "destructive",
          title: t("toast-edit-error"),
        });
      }
    });
  };

  return (
    <DashboardTeamSettingsEditionContext.Provider
      value={{
        isUpdating,
        isSubmittable,
        formRef,
        save,
      }}
    >
      <Form {...form}>{children}</Form>
    </DashboardTeamSettingsEditionContext.Provider>
  );
}

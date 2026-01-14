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
import { useTeamContext } from "./team-provider";
import { Form } from "@/components/shadcn/form";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";

export interface DashboardTeamSettingsEditionContextProps {
  isUpdating: boolean;
  isSubmittable?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  // TODO use correct form schema type
  save: (values: any) => void;
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
  const _t = useTranslations("dashboard.teamSettings");

  // TODO use correct form schema
  const form = useForm<any>({
    defaultValues: activeTeam,
  });

  const isSubmittable = useMemo(
    () => form.formState.isValid && form.formState.isDirty,
    [form.formState.isValid, form.formState.isDirty],
  );

  const [isUpdating, startTransition] = useTransition();
  // TODO use correct form schema type
  const save = (values: any) => {
    startTransition(async () => {
      try {
        // await editEvent({ ...values, eventId });
        // form.reset(values, { keepDirty: false });
        // trackEvent("EventEdited", {
        //   props: {
        //     eventId,
        //   },
        // });
        // toast({
        //   title: t("toast-edit-success"),
        // });
      } catch (err) {
        // Revert optimistic update
        captureException(err);
        toast({
          variant: "destructive",
          // title: t("toast-edit-error"),
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

"use client";

import {
  createContext,
  useContext,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { communityAdministrators } from "@/lib/queries/community";
import { captureException } from "@/lib/report";
import { useDashboardCommunityContext } from "@/components/providers/dashboard-community-context-provider";

interface CommunityAdministratorsEditionContextProviderProps {
  children: React.ReactNode;
}

interface CommunityAdministratorsEditionContextType {
  onAdd: (email: string) => void;
  onDelete: (email: string) => void;
  administrators: string[];
  isActionPending: boolean;
}

const CommunityAdministratorsEditionContext =
  createContext<CommunityAdministratorsEditionContextType>({} as never);

export function CommunityAdministratorsEditionContextProvider({
  children,
}: CommunityAdministratorsEditionContextProviderProps) {
  const t = useTranslations("dashboard.communityDetails.administrators");
  const { communityId, communityInfo } = useDashboardCommunityContext();
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvents();
  const { getToken } = useAuth();
  const { mutateAsync: editCommunity } = useEditCommunity();

  const { data: administrators } = useSuspenseQuery(
    communityAdministrators(communityId, getToken),
  );

  const [previousAdministrators, setPreviousAdministrators] = useState<
    string[] | null
  >(null);
  const [localAdministrators, setAdministrators] =
    useState<string[]>(administrators);
  const [isActionPending, startTransition] = useTransition();

  const [optimisticAdministrators, setOptimisticAdministrators] = useOptimistic(
    localAdministrators,
    (_, newAdministrators: string[]) => newAdministrators,
  );

  const edit = async (
    previousAdministrators: string[],
    newAdministrators: string[],
  ) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token is missing");
      }

      await editCommunity({
        token,
        communityId,
        displayName: communityInfo.displayName,
        description: communityInfo.description,
        avatarUri: communityInfo.avatarUri,
        bannerUri: communityInfo.bannerUri,
        administrators: newAdministrators,
      });
      // Persist optimistic update
      setAdministrators(newAdministrators);
      trackEvent("CommunityEdited", {
        props: {
          communityId,
        },
      });
      toast({
        title: t("toast-administrator-management-success"),
      });
    } catch (err) {
      // Revert optimistic update
      setAdministrators(previousAdministrators);
      setPreviousAdministrators(null);
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-administrator-management-error"),
      });
    }
  };

  const startDelete = async (
    previousAdministrators: string[],
    newAdministrators: string[],
  ) => {
    await edit(previousAdministrators, newAdministrators);
  };

  const deleteDebounced = useDebouncedCallback(startDelete, 600);

  const onDelete = (email: string) => {
    const newAdministrators = localAdministrators.filter(
      (administratorEmail) => administratorEmail !== email,
    );

    const previous =
      previousAdministrators !== null
        ? previousAdministrators
        : [...localAdministrators];
    if (previousAdministrators === null) {
      setPreviousAdministrators([...localAdministrators]);
    }
    setAdministrators(newAdministrators);
    deleteDebounced(previous, newAdministrators);
  };

  const onAdd = async (email: string) => {
    startTransition(async () => {
      setOptimisticAdministrators([...localAdministrators, email]);
      // No debounce on add to provide better UX
      await edit(localAdministrators, [...localAdministrators, email]);
    });
  };

  return (
    <CommunityAdministratorsEditionContext.Provider
      value={{
        onAdd,
        onDelete,
        administrators: optimisticAdministrators,
        isActionPending,
      }}
    >
      {children}
    </CommunityAdministratorsEditionContext.Provider>
  );
}

export function useCommunityAdministratorsEditionContext() {
  const context = useContext(CommunityAdministratorsEditionContext);

  if (!context) {
    throw new Error(
      "useCommunityAdministratorsEditionContext must be used within a CommunityAdministratorsEditionContextProvider",
    );
  }
  return context;
}

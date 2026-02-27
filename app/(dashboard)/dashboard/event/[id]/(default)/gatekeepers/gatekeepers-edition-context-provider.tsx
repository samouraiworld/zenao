"use client";

import {
  createContext,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { eventGatekeepersEmails } from "@/lib/queries/event";
import {
  communitiesListByEvent,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { makeLocationFromEvent } from "@/lib/location";
import { captureException } from "@/lib/report";
import { useToast } from "@/hooks/use-toast";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useEditEvent } from "@/lib/mutations/event-management";
import { EventFormSchemaType, SafeEventInfo } from "@/types/schemas";

interface GatekeepersEditionContextProviderProps {
  eventId: string;
  eventInfo: SafeEventInfo;
  children: React.ReactNode;
}

interface GatekeepersEditionContextType {
  onAdd: (email: string) => void;
  onDelete: (email: string) => void;
  gatekeepers: string[];
  isActionPending: boolean;
}

const GatekeepersEditionContext = createContext<GatekeepersEditionContextType>(
  {} as never,
);

export function GatekeepersEditionContextProvider({
  eventId,
  eventInfo,
  children,
}: GatekeepersEditionContextProviderProps) {
  const t = useTranslations("gatekeeper-management-dialog");
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvents();
  const { getToken } = useAuth();
  const { editEvent } = useEditEvent(getToken);
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );

  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId = communities.length > 0 ? communities[0].id : null;

  const location = makeLocationFromEvent(eventInfo.location);

  const [previousGatekeepers, setPreviousGatekeepers] = useState<
    string[] | null
  >(null);
  const [localGatekeepers, setGatekeepers] = useState<string[]>(
    gatekeepers.gatekeepers,
  );
  const [isActionPending, startTransition] = useTransition();

  const [optimisticGatekeepers, setOptimisticGatekeepers] = useOptimistic(
    localGatekeepers,
    (_, newGatekeepers: string[]) => newGatekeepers,
  );

  const edit = async (
    previousGatekeepers: string[],
    newGatekeepers: string[],
  ) => {
    const values: EventFormSchemaType = {
      capacity: eventInfo.capacity,
      title: eventInfo.title,
      description: eventInfo.description,
      startDate: eventInfo.startDate,
      endDate: eventInfo.endDate,
      discoverable: eventInfo.discoverable,
      imageUri: eventInfo.imageUri,
      location,
      gatekeepers: newGatekeepers.map((gatekeeperEmail) => ({
        email: gatekeeperEmail,
      })),
      exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
      password: "",
      pricesGroups: eventInfo.pricesGroups ?? [],
      communityId: communityId || null,
    };

    try {
      await editEvent({ ...values, eventId });
      // Persist optimistic update
      setGatekeepers(newGatekeepers);
      trackEvent("EventGatekeepersUpdated", {
        props: {
          eventId,
        },
      });
      toast({
        title: t("toast-gatekeeper-management-success"),
      });
    } catch (err) {
      // Revert optimistic update
      setGatekeepers(previousGatekeepers);
      setPreviousGatekeepers(null);
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-gatekeeper-management-error"),
      });
    }
  };

  const startDelete = async (
    previousGatekeepers: string[],
    newGatekeepers: string[],
  ) => {
    await edit(previousGatekeepers, newGatekeepers);
  };

  const deleteDebounced = useDebouncedCallback(startDelete, 600);

  const onDelete = (email: string) => {
    const newGatekeepers = localGatekeepers.filter(
      (gatekeeperEmail) => gatekeeperEmail !== email,
    );

    const previous =
      previousGatekeepers !== null
        ? previousGatekeepers
        : [...localGatekeepers];
    if (previousGatekeepers === null) {
      setPreviousGatekeepers([...localGatekeepers]);
    }
    setGatekeepers(newGatekeepers);
    deleteDebounced(previous, newGatekeepers);
  };

  const onAdd = async (email: string) => {
    startTransition(async () => {
      setOptimisticGatekeepers([...localGatekeepers, email]);
      // No debounce on add to provide better UX
      await edit(localGatekeepers, [...localGatekeepers, email]);
    });
  };

  return (
    <GatekeepersEditionContext.Provider
      value={{
        onAdd,
        onDelete,
        gatekeepers: optimisticGatekeepers,
        isActionPending,
      }}
    >
      {children}
    </GatekeepersEditionContext.Provider>
  );
}

export function useGatekeepersEdition() {
  const context = useContext(GatekeepersEditionContext);

  if (!context) {
    throw new Error(
      "useGatekeepersEdition must be used within a GatekeepersEditionContextProvider",
    );
  }
  return context;
}

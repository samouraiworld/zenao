"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "../shadcn/form";
import { useDashboardEventContext } from "./dashboard-event-context-provider";
import { makeLocationFromEvent } from "@/lib/location";
import { useEditEvent } from "@/lib/mutations/event-management";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { eventGatekeepersEmails } from "@/lib/queries/event";
import { EventUserRole, eventUserRoles } from "@/lib/queries/event-users";
import { userInfoOptions } from "@/lib/queries/user";
import { eventFormSchema, EventFormSchemaType } from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import { captureException } from "@/lib/report";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

interface DashboardEventEditionContextProps {
  roles: EventUserRole[];
  isUpdating: boolean;
  isSubmittable?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  save: (values: EventFormSchemaType) => void;
}

const DashboardEventEditionContext =
  createContext<DashboardEventEditionContextProps>({} as never);

interface DashboardEventEditionContextProviderProps {
  children: React.ReactNode;
}

export function useDashboardEventEditionContext() {
  const context = useContext(DashboardEventEditionContext);

  if (!context) {
    throw new Error(
      "useDashboardEventEditionContext must be used within a DashboardEventEditionContextProvider",
    );
  }
  return context;
}

export default function DashboardEventEditionContextProvider({
  children,
}: DashboardEventEditionContextProviderProps) {
  const t = useTranslations("eventForm");
  const { eventInfo, eventId } = useDashboardEventContext();
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvents();
  const { getToken, userId } = useAuth();
  const { editEvent } = useEditEvent(getToken);
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );

  const formRef = useRef<HTMLFormElement>(null);

  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId =
    communities.length > 0
      ? communityIdFromPkgPath(communities[0].pkgPath)
      : null;

  const location = makeLocationFromEvent(eventInfo.location);

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  const defaultValues: EventFormSchemaType = {
    capacity: eventInfo.capacity,
    title: eventInfo.title,
    description: eventInfo.description,
    startDate: eventInfo.startDate,
    endDate: eventInfo.endDate,
    discoverable: eventInfo.discoverable,
    imageUri: eventInfo.imageUri,
    location,
    gatekeepers: gatekeepers.gatekeepers.map((gatekeeperEmail) => ({
      email: gatekeeperEmail,
    })),
    exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
    password: "",
    communityId: communityId || null,
  };

  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      eventFormSchema.refine(
        (data) => {
          if (data.exclusive && !defaultValues.exclusive) {
            return data.password && data.password.length > 0;
          }
          return true;
        },
        {
          message: "Password is required when event is exclusive",
          path: ["password"],
        },
      ),
    ),
    defaultValues,
  });

  const isSubmittable = useMemo(
    () => form.formState.isValid && form.formState.isDirty,
    [form.formState.isValid, form.formState.isDirty],
  );

  const [isUpdating, startTransition] = useTransition();
  const save = (values: EventFormSchemaType) => {
    startTransition(async () => {
      try {
        await editEvent({ ...values, eventId });
        form.reset(values, { keepDirty: false });
        trackEvent("EventEdited", {
          props: {
            eventId,
          },
        });
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
    <DashboardEventEditionContext.Provider
      value={{
        roles,
        isUpdating,
        isSubmittable,
        formRef,
        save,
      }}
    >
      <Form {...form}>{children}</Form>
    </DashboardEventEditionContext.Provider>
  );
}

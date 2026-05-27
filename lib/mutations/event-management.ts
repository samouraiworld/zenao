import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { eventGatekeepersEmails, eventOptions } from "../queries/event";
import { currentTimezone } from "../time";
import { GetToken } from "../utils";
import { EventFormSchemaType } from "@/types/schemas";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

const sanitizePriceGroupsForCommunity = (data: EventFormSchemaType) => {
  if (data.communityId) {
    return data.pricesGroups;
  }

  return (data.pricesGroups ?? []).map((group) => ({
    ...group,
    prices: (group.prices ?? []).map((price) => ({
      ...price,
      amountMinor: BigInt(0),
      currencyCode: "",
      paymentAccountId: "",
    })),
  }));
};

export const useCreateEvent = () => {
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async (
      data: EventFormSchemaType & {
        token: string;
      },
    ) => {
      const { token, password, exclusive } = data;

      // Construct location object for the call
      let value = {};
      switch (data.location.kind) {
        case "custom":
          value = {
            address: data.location.address,
            timezone: data.location.timeZone,
          };
          break;
        case "virtual":
          value = { uri: data.location.location };
          break;
        case "geo":
          value = {
            address: data.location.address,
            lat: data.location.lat,
            lng: data.location.lng,
            size: data.location.size,
          };
          break;
        default:
          value = {};
      }

      const sanitizedPriceGroups = sanitizePriceGroupsForCommunity(data);
      const event = await zenaoClient.createEvent(
        {
          ...data,
          gatekeepers: data.gatekeepers.map((gatekeeper) => gatekeeper.email),
          location: { address: { case: data.location.kind, value } },
          password: exclusive && password ? password : "",
          pricesGroups: sanitizedPriceGroups,
          communityId: data.communityId || "",
          communityEmail: true,
        },
        {
          headers: buildHeaders(token),
        },
      );

      return event;
    },
  });

  return {
    createEvent: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

export const useEditEvent = (getToken: GetToken) => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async (
      data: EventFormSchemaType & {
        eventId: string;
      },
    ) => {
      const { eventId, password, exclusive } = data;
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      // Construct location object for the call
      let value = {};
      switch (data.location.kind) {
        case "custom":
          value = {
            address: data.location.address,
            timezone: currentTimezone(),
          };
          break;
        case "virtual":
          value = { uri: data.location.location };
          break;
        case "geo":
          value = {
            address: data.location.address,
            lat: data.location.lat,
            lng: data.location.lng,
            size: data.location.size,
          };
          break;
        default:
          value = {};
      }

      const sanitizedPriceGroups = sanitizePriceGroupsForCommunity(data);
      await zenaoClient.editEvent(
        {
          ...data,
          eventId,
          gatekeepers: data.gatekeepers.map((gatekeeper) => gatekeeper.email),
          location: { address: { case: data.location.kind, value } },
          updatePassword: !exclusive || (!!password && password.length > 0),
          password: exclusive && password ? password : "",
          pricesGroups: sanitizedPriceGroups,
          communityId: data.communityId || "",
          communityEmail: true,
        },
        {
          headers: buildHeaders(token),
        },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries(eventOptions(variables.eventId));
      await queryClient.invalidateQueries(
        eventGatekeepersEmails(variables.eventId, getToken),
      );
    },
  });

  return {
    editEvent: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

type EventBroadcastEmailRequest = {
  eventId: string;
  token: string;
  message: string;
  attachTicket: boolean;
};

export const useEventBroadcastEmail = () => {
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      token,
      message,
      attachTicket,
    }: EventBroadcastEmailRequest) => {
      await zenaoClient.broadcastEvent(
        {
          eventId,
          message,
          attachTicket,
        },
        { headers: buildHeaders(token) },
      );
    },
  });

  return {
    broadcastEmail: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

type EventCheckInRequest = {
  eventId: string;
  signature: string;
  ticketPubkey: string;
  token: string;
};

export const useEventCheckIn = () => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      signature,
      ticketPubkey,
      token,
    }: EventCheckInRequest) => {
      await zenaoClient.checkin(
        {
          signature,
          ticketPubkey,
        },
        { headers: buildHeaders(token) },
      );
    },
    onSuccess: (_, variables) => {
      const eventOpts = eventOptions(variables.eventId);

      queryClient.invalidateQueries(eventOpts);
    },
  });

  return {
    checkIn: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

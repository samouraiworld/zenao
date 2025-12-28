import { useMutation } from "@tanstack/react-query";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { rolesAbi } from "zodiac-roles-sdk";
import { getQueryClient } from "../get-query-client";
import { eventGatekeepersEmails, eventOptions } from "../queries/event";
import { currentTimezone } from "../time";
import { GetToken } from "../utils";
import { ticketMasterABI, ticketMasterAddress } from "../evm";
import { EventGatekeeperRoleKey, EventOrganizerRoleKey } from "../zodiac";
import { eventUserRoles } from "../queries/event-users";
import { EventFormSchemaType } from "@/types/schemas";
import { zenaoClient } from "@/lib/zenao-client";

export const useCreateEvent = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      password,
      exclusive,
      ...data
    }: EventFormSchemaType & {
      token: string;
    }) => {
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

      const event = await zenaoClient.createEvent(
        {
          ...data,
          gatekeepers: data.gatekeepers.map((gatekeeper) => gatekeeper.email),
          location: { address: { case: data.location.kind, value } },
          password: exclusive && password ? password : "",
          communityId: data.communityId || "",
          communityEmail: true,
        },
        {
          headers: { Authorization: "Bearer " + token },
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
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      password,
      exclusive,
      ...data
    }: EventFormSchemaType & {
      eventId: string;
    }) => {
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

      await zenaoClient.editEvent(
        {
          ...data,
          eventId,
          gatekeepers: data.gatekeepers.map((gatekeeper) => gatekeeper.email),
          location: { address: { case: data.location.kind, value } },
          updatePassword: !exclusive || (!!password && password.length > 0),
          password: exclusive && password ? password : "",
          communityId: data.communityId || "",
          communityEmail: true,
        },
        {
          headers: { Authorization: "Bearer " + token },
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
        { headers: { Authorization: `Bearer ${token}` } },
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
  signature: Uint8Array;
  ticketPubkey: Uint8Array;
};

export const useEventCheckIn = () => {
  const queryClient = getQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      signature,
      ticketPubkey,
    }: EventCheckInRequest) => {
      const evmClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
      });

      console.log("user address", address);

      console.log("ticket master address", ticketMasterAddress);

      const rolesModAddr = await evmClient.readContract({
        abi: ticketMasterABI,
        address: ticketMasterAddress,
        functionName: "roles_mod",
        args: [eventId as `0x${string}`],
      });

      console.log(
        "checkin data",
        "addr",
        address,
        "pk",
        `0x${Buffer.from(ticketPubkey).toString("hex")}`,
        "sig",
        `0x${Buffer.from(signature).toString("hex")}`,
      );

      const checkinData = encodeFunctionData({
        abi: ticketMasterABI,
        functionName: "checkin",
        args: [
          address as `0x${string}`,
          `0x${Buffer.from(ticketPubkey).toString("hex")}`,
          `0x${Buffer.from(signature).toString("hex")}`,
        ],
      });

      const roles = await queryClient.fetchQuery(
        eventUserRoles(eventId, address),
      );

      let roleKey: `0x${string}`;
      if (roles.includes("organizer")) {
        roleKey = EventOrganizerRoleKey;
      } else if (roles.includes("gatekeeper")) {
        roleKey = EventGatekeeperRoleKey;
      } else {
        throw new Error("user is neither organizer not gatekeeper");
      }

      console.log("roles mod address", rolesModAddr);

      const res = await writeContractAsync({
        abi: rolesAbi,
        address: rolesModAddr,
        functionName: "execTransactionWithRole",
        args: [
          ticketMasterAddress, // to
          BigInt(0), // value
          checkinData, // data
          0, // operation -> Call = 0, DelegateCall = 1
          roleKey, // roleKey
          true, // should revert
        ],
      });

      console.log("checked in", res);
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

import { useMutation } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { getQueryClient } from "../get-query-client";
import { eventOptions } from "../queries/event";
import { eventUserRoles, eventUsersWithRole } from "../queries/event-users";
import { eventTickets } from "../queries/ticket";
import { GetToken } from "../utils";
import { ticketMasterABI, ticketMasterAddress } from "../evm";

type EventCancelParticipationRequest = {
  eventId: string;
  getToken: GetToken;
  userRealmId: string | null;
};

export const useEventCancelParticipation = () => {
  const queryClient = getQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const client = usePublicClient();
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      eventId,
      // getToken,
    }: EventCancelParticipationRequest) => {
      if (!client) {
        throw new Error("no wagmi client");
      }
      const ticketPubKey = await client.readContract({
        abi: ticketMasterABI,
        address: ticketMasterAddress,
        functionName: "ticket_by_owner",
        args: [eventId as `0x${string}`, address as `0x${string}`],
      });
      const res = await writeContractAsync({
        abi: ticketMasterABI,
        functionName: "cancelTicket",
        address: ticketMasterAddress,
        args: [eventId as `0x${string}`, ticketPubKey],
      });
      console.log("cancelled ticket", res);
    },
    onSuccess: (_, variables, _ctx) => {
      const eventTicketsOpts = eventTickets(
        variables.eventId,
        variables.getToken,
      );
      const eventInfoOpts = eventOptions(variables.eventId);
      const eventUserRolesOpts = eventUserRoles(
        variables.eventId,
        variables.userRealmId,
      );
      const eventUsersWithRoleOpts = eventUsersWithRole(
        variables.eventId,
        "participant",
      );

      queryClient.invalidateQueries(eventInfoOpts);
      queryClient.invalidateQueries(eventTicketsOpts);
      queryClient.invalidateQueries(eventUserRolesOpts);
      queryClient.invalidateQueries(eventUsersWithRoleOpts);
    },
  });

  return {
    cancelParticipation: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

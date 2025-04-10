import { QueryClient, useMutation } from "@tanstack/react-query";
import {
  CreatePollRequestJson,
  VotePollRequestJson,
} from "@/app/gen/zenao/v1/zenao_pb";
import { zenaoClient } from "@/app/zenao-client";
import { PollKind } from "@/app/gen/polls/v1/polls_pb";

interface CreatePollRequestMutation
  extends Required<Omit<CreatePollRequestJson, "kind" | "duration">> {
  kind: PollKind;
  duration: bigint;
  token: string | null;
}

export const useCreatePoll = (queryClient: QueryClient) => {
  void queryClient;

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: CreatePollRequestMutation) => {
      await zenaoClient.createPoll(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    // TODO Optimistic updates
    // onMutate: async (variables) => {}
    // onSuccess: (_, variables) => {}
    // onError: (_, variables, context) => {}
  });

  return {
    createPoll: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

interface VotePollRequestMutation extends Required<VotePollRequestJson> {
  token: string | null;
}

export const useVotePoll = (queryClient: QueryClient) => {
  void queryClient;

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: VotePollRequestMutation) => {
      await zenaoClient.votePoll(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    // TODO Optimistic updates
    // onMutate: async (variables) => {}
    // onSuccess: (_, variables) => {}
    // onError: (_, variables, context) => {}
  });

  return {
    votePoll: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

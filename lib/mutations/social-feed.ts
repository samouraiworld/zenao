import { QueryClient, useMutation } from "@tanstack/react-query";
import { feedPosts, fetchPoll } from "../queries/social-feed";
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
  userAddress: string;
}

export const useCreatePoll = (queryClient: QueryClient) => {
  void queryClient;

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: CreatePollRequestMutation) => {
      await zenaoClient.createPoll(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        0,
        100,
        "",
        variables.userAddress,
      );
      const previousFeedPosts = queryClient.getQueryData(
        feedPostsOpts.queryKey,
      );

      return { previousFeedPosts };
    },
    onSuccess: (_, variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        0,
        100,
        "",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        0,
        100,
        "",
        variables.userAddress,
      );

      queryClient.setQueryData(
        feedPostsOpts.queryKey,
        context?.previousFeedPosts,
      );
    },
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
  userAddress: string;
}

export const useVotePoll = (queryClient: QueryClient) => {
  void queryClient;

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: VotePollRequestMutation) => {
      await zenaoClient.votePoll(
        {
          pollId: request.pollId,
          option: request.option,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onMutate: async (variables) => {
      const fetchPollOpts = fetchPoll(variables.pollId, variables.userAddress);
      const previousPollPost = queryClient.getQueryData(fetchPollOpts.queryKey);

      return { previousPollPost };
    },
    onSuccess: (_, variables) => {
      const fetchPollOpts = fetchPoll(variables.pollId, variables.userAddress);
      queryClient.invalidateQueries(fetchPollOpts);
    },
    onError: (_, variables, context) => {
      const fetchPollOpts = fetchPoll(variables.pollId, variables.userAddress);
      queryClient.setQueryData(
        fetchPollOpts.queryKey,
        context?.previousPollPost,
      );
    },
  });

  return {
    votePoll: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

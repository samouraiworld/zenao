import { QueryClient, useMutation } from "@tanstack/react-query";
import { feedPosts, pollInfo } from "../queries/social-feed";
import {
  CreatePollRequest,
  CreatePostRequest,
  VotePollRequest,
} from "@/app/gen/zenao/v1/zenao_pb";
import { zenaoClient } from "@/app/zenao-client";
import { PollKind } from "@/app/gen/polls/v1/polls_pb";

interface CreatePollRequestMutation
  extends Required<Omit<CreatePollRequest, "kind" | "duration">> {
  kind: PollKind;
  duration: bigint;
  token: string | null;
  userAddress: string;
}

export const useCreatePoll = (queryClient: QueryClient) => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: CreatePollRequestMutation) => {
      await zenaoClient.createPoll(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
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
        100,
        "",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
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

interface VotePollRequestMutation extends Required<VotePollRequest> {
  token: string | null;
  userAddress: string;
}

export const useVotePoll = (queryClient: QueryClient) => {
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
      const pollInfoOpts = pollInfo(variables.pollId, variables.userAddress);
      const previousPollPost = queryClient.getQueryData(pollInfoOpts.queryKey);

      return { previousPollPost };
    },
    onSuccess: (_, variables) => {
      const pollInfoOpts = pollInfo(variables.pollId, variables.userAddress);
      queryClient.invalidateQueries(pollInfoOpts);
    },
    onError: (_, variables, context) => {
      const pollInfoOpts = pollInfo(variables.pollId, variables.userAddress);
      queryClient.setQueryData(
        pollInfoOpts.queryKey,
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

interface CreateStandardPostRequestMutation extends CreatePostRequest {
  token: string | null;
  userAddress: string;
}

export const useCreateStandardPost = (queryClient: QueryClient) => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      userAddress: _,
      ...request
    }: CreateStandardPostRequestMutation) => {
      await zenaoClient.createPost(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
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
        100,
        "",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
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
    createStandardPost: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

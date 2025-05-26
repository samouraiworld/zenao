import { QueryClient, useMutation } from "@tanstack/react-query";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  DEFAULT_FEED_POSTS_LIMIT,
  feedPosts,
  feedPostsChildren,
  pollInfo,
} from "../queries/social-feed";
import { getQueryClient } from "../get-query-client";
import {
  CreatePollRequest,
  CreatePostRequest,
  VotePollRequest,
} from "@/app/gen/zenao/v1/zenao_pb";
import { zenaoClient } from "@/app/zenao-client";

interface CreatePollRequestMutation
  extends Required<Omit<CreatePollRequest, "$typeName" | "$unknown">> {
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
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );

      const previousFeedPosts = queryClient.getQueryData(
        feedPostsOpts.queryKey,
      );
      const previousFeedPolls = queryClient.getQueryData(
        feedPollsOpts.queryKey,
      );

      return { previousFeedPosts, previousFeedPolls };
    },
    onSuccess: (_, variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPollsOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );

      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );

      queryClient.setQueryData(
        feedPostsOpts.queryKey,
        context?.previousFeedPosts,
      );
      queryClient.setQueryData(
        feedPollsOpts.queryKey,
        context?.previousFeedPolls,
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

interface VotePollRequestMutation extends Omit<VotePollRequest, "$typeName"> {
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

interface CreateStandardPostRequestMutation
  extends Omit<CreatePostRequest, "$typeName"> {
  token: string | null;
  userAddress: string;
}

export const useCreateStandardPost = () => {
  const queryClient = getQueryClient();
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
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      const previousFeedPosts = queryClient.getQueryData(
        feedPostsOpts.queryKey,
      );

      const previousFeedPostsChildren = queryClient.getQueryData(
        feedPostsChildrenOpts.queryKey,
      );

      return { previousFeedPosts, previousFeedPostsChildren };
    },
    onSuccess: (_, variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );

      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPostsChildrenOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );

      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      queryClient.setQueryData(
        feedPostsOpts.queryKey,
        context?.previousFeedPosts,
      );

      queryClient.setQueryData(
        feedPostsChildrenOpts.queryKey,
        context?.previousFeedPostsChildren,
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

interface ReactPostRequestMutation {
  token: string | null;
  parentId: string; // Required for reloading comments
  userAddress: string;
  postId: string;
  icon: string;
  eventId: string;
}

export const useReactPost = (queryClient: QueryClient) => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token: token,
      userAddress: _addr,
      eventId: _eventId,
      ...request
    }: ReactPostRequestMutation) => {
      await zenaoClient.reactPost(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );

      const previousFeedPosts = queryClient.getQueryData(
        feedPostsOpts.queryKey,
      );

      const previousFeedPolls = queryClient.getQueryData(
        feedPollsOpts.queryKey,
      );

      const previousFeedPostsChildren = queryClient.getQueryData(
        feedPostsChildrenOpts.queryKey,
      );

      return {
        previousFeedPosts,
        previousFeedPolls,
        previousFeedPostsChildren,
      };
    },
    onSuccess: (_, variables) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPollsOpts);
      queryClient.invalidateQueries(feedPostsChildrenOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userAddress,
      );
      const feedPollsOpts = feedPosts(
        variables.eventId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userAddress,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userAddress,
      );

      queryClient.setQueryData(
        feedPostsOpts.queryKey,
        context?.previousFeedPosts,
      );
      queryClient.setQueryData(
        feedPollsOpts.queryKey,
        context?.previousFeedPolls,
      );
      queryClient.setQueryData(
        feedPostsChildrenOpts.queryKey,
        context?.previousFeedPostsChildren,
      );
    },
  });

  return {
    reactPost: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

import { QueryClient, useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import {
  DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
  DEFAULT_FEED_POSTS_LIMIT,
  feedPost,
  feedPosts,
  feedPostsChildren,
  pollInfo,
} from "../queries/social-feed";
import { GetToken } from "../utils";
import { zenaoClient } from "@/lib/zenao-client";
import {
  CreatePollRequest,
  CreatePostRequest,
  PinPostRequestJson,
  VotePollRequest,
} from "@/app/gen/zenao/v1/zenao_pb";

interface CreatePollRequestMutation
  extends Required<Omit<CreatePollRequest, "$typeName" | "$unknown">> {
  duration: bigint;
  token: string | null;
  userId: string;
}

export const useCreatePoll = (queryClient: QueryClient) => {
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ token, ...request }: CreatePollRequestMutation) => {
      await zenaoClient.createPoll(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
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
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPollsOpts);
    },
    onError: (_, variables, context) => {
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );

      const feedPollsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
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
  userId: string;
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
      const pollInfoOpts = pollInfo(variables.pollId, variables.userId);
      const previousPollPost = queryClient.getQueryData(pollInfoOpts.queryKey);

      return { previousPollPost };
    },
    onSuccess: (_, variables) => {
      const pollInfoOpts = pollInfo(variables.pollId, variables.userId);
      queryClient.invalidateQueries(pollInfoOpts);
    },
    onError: (_, variables, context) => {
      const pollInfoOpts = pollInfo(variables.pollId, variables.userId);
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
  userId: string;
}

export const useCreateStandardPost = () => {
  const queryClient = getQueryClient();

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      ...request
    }: CreateStandardPostRequestMutation) => {
      await zenaoClient.createPost(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );

      const parentPostOpts = feedPost(variables.parentId, variables.userId);
      const previousParentPost = queryClient.getQueryData(
        parentPostOpts.queryKey,
      );

      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
      );

      const previousFeedPosts = queryClient.getQueryData(
        feedPostsOpts.queryKey,
      );

      const previousFeedPostsChildren = queryClient.getQueryData(
        feedPostsChildrenOpts.queryKey,
      );

      return {
        previousParentPost,
        previousFeedPosts,
        previousFeedPostsChildren,
      };
    },
    onSuccess: (_, variables) => {
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );

      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
      );

      const parentPostOpts = feedPost(variables.parentId, variables.userId);

      queryClient.invalidateQueries(parentPostOpts);
      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPostsChildrenOpts);
    },
    onError: (_, variables, context) => {
      const feedId = `${variables.orgType}:${variables.orgId}:main`;

      const feedPostsOpts = feedPosts(
        feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );

      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
      );

      const parentPostOpts = feedPost(variables.parentId, variables.userId);

      queryClient.setQueryData(
        parentPostOpts.queryKey,
        context?.previousParentPost,
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
  userId: string;
  postId: string;
  icon: string;
  feedId: string;
}

export const useReactPost = () => {
  const queryClient = getQueryClient();
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token: token,
      userId: _addr,
      ...request
    }: ReactPostRequestMutation) => {
      await zenaoClient.reactPost(request, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async (variables) => {
      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
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
      const feedPostOpts = feedPost(variables.postId, variables.userId);
      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
      );

      queryClient.invalidateQueries(feedPostsChildrenOpts);
      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPostOpts);
      queryClient.invalidateQueries(feedPollsOpts);
    },
    onError: (_, variables, context) => {
      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
      );
      const feedPostsChildrenOpts = feedPostsChildren(
        variables.parentId,
        DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
        "",
        variables.userId,
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

type EditStandardPostRequestMutation = {
  feedId: string;
  postId: string;
  userId: string;
  token: string | null;
  content: string;
  tags: string[];
  parentId?: string;
};

export const useEditStandardPost = () => {
  const queryClient = getQueryClient();
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      content,
      postId,
    }: EditStandardPostRequestMutation) => {
      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.editPost(
        {
          content,
          postId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: (_, variables) => {
      const feedPostOpts = feedPost(variables.postId, variables.userId);
      queryClient.invalidateQueries(feedPostOpts);

      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      queryClient.invalidateQueries(feedPostsOpts);

      if (variables.parentId) {
        const feedPostsChildrenOpts = feedPostsChildren(
          variables.parentId,
          DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
          "",
          variables.userId,
        );

        queryClient.invalidateQueries(feedPostsChildrenOpts);
      }
    },
  });

  return {
    editPost: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

type DeletePostRequestMutation = {
  feedId: string;
  postId: string;
  parentId?: string;
  userId: string;
  token: string | null;
};

export const useDeletePost = () => {
  const queryClient = getQueryClient();
  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ postId, token }: DeletePostRequestMutation) => {
      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.deletePost(
        {
          postId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: (_, variables) => {
      const feedPostOpts = feedPost(variables.postId, variables.userId);
      queryClient.invalidateQueries(feedPostOpts);

      if (variables.parentId) {
        const feedPostsChildrenOpts = feedPostsChildren(
          variables.parentId,
          DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
          "",
          variables.userId,
        );
        const feedParentPostOpts = feedPost(
          variables.parentId,
          variables.userId,
        );

        queryClient.invalidateQueries(feedPostsChildrenOpts);
        queryClient.invalidateQueries(feedParentPostOpts);
      }
      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPollsOpts);
    },
  });

  return {
    deletePost: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

interface PinPostUpdateRequest extends Required<PinPostRequestJson> {
  feedId: string;
  parentId?: string;
  userId: string;
}

export const usePinPostUpdate = (getToken: GetToken) => {
  const queryClient = getQueryClient();

  const { isPending, mutateAsync, isSuccess, isError } = useMutation({
    mutationFn: async ({ postId, pinned }: PinPostUpdateRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.pinPost(
        {
          postId,
          pinned: pinned,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate feed posts to reflect pin change
      const feedPostOpts = feedPost(variables.postId, variables.userId);
      queryClient.invalidateQueries(feedPostOpts);

      if (variables.parentId) {
        const feedPostsChildrenOpts = feedPostsChildren(
          variables.parentId,
          DEFAULT_FEED_POSTS_COMMENTS_LIMIT,
          "",
          variables.userId,
        );
        const feedParentPostOpts = feedPost(
          variables.parentId,
          variables.userId,
        );

        queryClient.invalidateQueries(feedPostsChildrenOpts);
        queryClient.invalidateQueries(feedParentPostOpts);
      }
      const feedPostsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "",
        variables.userId,
      );
      const feedPollsOpts = feedPosts(
        variables.feedId,
        DEFAULT_FEED_POSTS_LIMIT,
        "poll",
        variables.userId,
      );

      queryClient.invalidateQueries(feedPostsOpts);
      queryClient.invalidateQueries(feedPollsOpts);
    },
  });

  return {
    updatePinPost: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};

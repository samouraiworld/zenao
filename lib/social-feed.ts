import {
  LinkPost,
  Post,
  PostView,
  StandardPost,
} from "@/app/gen/feeds/v1/feeds_pb";
import { Poll } from "@/app/gen/polls/v1/polls_pb";

// TODO implement all types of post
// postType:
//   | "article"
//   | "audio"
//   | "video"
//   | "image"
//   | "link"
//   | "standard"
//   | "poll";

export type SocialFeedPost =
  | SocialFeedPoll
  | SocialFeedStandardPost
  | SocialFeedUnknownPost;

export type SocialFeedPoll = {
  postType: "poll";
  data: PollPostView;
};

export type SocialFeedStandardPost = {
  postType: "standard";
  data: StandardPostView;
};

export type SocialFeedUnknownPost = {
  postType: "unknown";
  data: PostView;
};

export type PollPostView = PostView & {
  post: Post & {
    post: {
      value: LinkPost;
      case: "link";
    };
  };
};

export type StandardPostView = PostView & {
  post: Post & {
    post: {
      value: StandardPost;
      case: "standard";
    };
  };
};

export type OtherPostView = PostView & {
  post: Post;
};

export type PollPostViewInfo = PollPostView & {
  poll: Poll;
};

export const isPollPost = (postView: PostView): postView is PollPostView => {
  return (
    postView.post?.post.case === "link" && postView.post?.tags?.includes("poll")
  );
};

export const isStandardPost = (
  postView: PostView,
): postView is StandardPostView => {
  return postView.post?.post.case === "standard";
};

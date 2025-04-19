import {
  LinkPost,
  Post,
  PostView,
  StandardPost,
} from "@/app/gen/feeds/v1/feeds_pb";
import { Poll } from "@/app/gen/polls/v1/polls_pb";

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

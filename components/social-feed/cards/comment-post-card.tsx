import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PostCardLayout } from "./post-card-layout";
import { OrgType } from "@/lib/organization";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import { StandardPostView } from "@/lib/social-feed";
import { eventUserRoles } from "@/lib/queries/event-users";
import { communityUserRoles } from "@/lib/queries/community";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

// EventRoles and CommunityRoles are used to fetch and cache user roles conditionally, depending on orgType, in PostComment
function EventRoles({
  orgId,
  userRealmId,
}: {
  orgId: string;
  userRealmId: string;
}) {
  useSuspenseQuery(eventUserRoles(orgId, userRealmId));
  return null;
}

function CommunityRoles({
  orgId,
  userRealmId,
}: {
  orgId: string;
  userRealmId: string;
}) {
  useSuspenseQuery(communityUserRoles(orgId, userRealmId));
  return null;
}

export default function CommentPostCard({
  orgType,
  orgId,
  parentId,
  comment,
  onReactionChange,
  onDelete,
  isReacting,
  isDeleting,
}: {
  orgType: OrgType;
  orgId: string;
  parentId: string;
  comment: StandardPostView;
  onReactionChange: (
    commentPostId: string,
    icon: string,
  ) => void | Promise<void>;
  onDelete: (commentPostId: string, parentId?: string) => void | Promise<void>;
  isReacting: boolean;
  isDeleting: boolean;
}) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(comment.post.author),
  );
  const [editMode, setEditMode] = useState(false);

  const standardPost = comment.post.post.value;

  return (
    <>
      {orgType === "event" ? (
        <EventRoles orgId={orgId} userRealmId={userRealmId} />
      ) : (
        <CommunityRoles orgId={orgId} userRealmId={userRealmId} />
      )}
      <PostCardLayout
        key={comment.post.localPostId}
        post={comment}
        createdBy={createdBy}
        parentId={parentId}
        editMode={editMode}
        onEditModeChange={setEditMode}
        onReactionChange={async (icon) =>
          await onReactionChange(comment.post.localPostId.toString(10), icon)
        }
        isReacting={isReacting}
        canInteract
        isOwner={userRealmId === comment.post.author}
        onDelete={async (parentId) =>
          await onDelete(comment.post.localPostId.toString(10), parentId)
        }
        isDeleting={isDeleting}
      >
        <MarkdownPreview markdownString={standardPost.content} />
      </PostCardLayout>
    </>
  );
}

"use client";

import { UserAvatar, UserAvatarSkeleton } from "../features/user/user";

function UsersAvatarsPreview({ users }: { users: string[] }) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {users.map((userId) => (
        <UserAvatar
          key={userId}
          className="flex ring-2 ring-background/80"
          userId={userId}
          size="sm"
        />
      ))}
    </div>
  );
}

export function UsersAvatarsPreviewFallback({
  nbUsers = 6,
}: {
  nbUsers?: number;
}) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {new Array(nbUsers).fill(null).map((_, index) => (
        <UserAvatarSkeleton key={index} size="sm" />
      ))}
    </div>
  );
}

export default UsersAvatarsPreview;

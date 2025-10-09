"use client";

import { UserAvatar } from "../features/user/user";

function UsersAvatarsPreview({ users }: { users: string[] }) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {users.map((realmId) => (
        <UserAvatar
          key={realmId}
          className="flex ring-2 ring-background/80"
          realmId={realmId}
          size="sm"
        />
      ))}
    </div>
  );
}

export default UsersAvatarsPreview;

"use client";

import { UserAvatar } from "../features/user/user";

function UsersAvatarsPreview({ usersAddresses }: { usersAddresses: string[] }) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {usersAddresses.map((address) => (
        <UserAvatar
          key={address}
          className="flex ring-2 ring-background/80"
          address={address}
          size="sm"
        />
      ))}
    </div>
  );
}

export default UsersAvatarsPreview;

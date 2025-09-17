"use client";

import { UserAvatarSmall } from "../features/user/user";

function UsersAvatarsPreview({ usersAddresses }: { usersAddresses: string[] }) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {usersAddresses.map((address) => (
        <UserAvatarSmall
          key={address}
          className="flex ring-2 ring-background/80"
          address={address}
        />
      ))}
    </div>
  );
}

export default UsersAvatarsPreview;

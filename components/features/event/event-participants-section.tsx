"use client";

import React, { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { eventUsersWithRole } from "@/lib/queries/event-users";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/shadcn/drawer";
import { UserAvatarWithName } from "@/components/features/user/user";
import UsersAvatarsPreview from "@/components/user/users-avatars-preview";
import UsersNamesPreview from "@/components/user/users-names-preview";

export function ParticipantsSection({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { data: participants } = useSuspenseQuery(
    eventUsersWithRole(id, "participant"),
  );
  const t = useTranslations("event");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isStandalone = useMediaQuery("(display-mode: standalone)");

  const onOpenChange = (state: boolean) => {
    setOpen(state);
  };

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-5">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger>
            <div className="flex flex-col gap-2">
              {/* 6 because we decide to show the first 6 participants avatars as preview */}
              <UsersAvatarsPreview
                users={
                  participants.length > 6
                    ? participants.slice(0, 6)
                    : participants
                }
              />
              <UsersNamesPreview usersAddresses={participants} />
            </div>
          </DialogTrigger>
          <DialogContent className="max-h-screen overflow-auto">
            <DialogHeader>
              <DialogTitle>{t("participants-list")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {participants.map((participantId) => {
                return (
                  <UserAvatarWithName
                    key={participantId}
                    userId={participantId}
                    className="h-10"
                    linkToProfile
                  />
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={!isStandalone}>
      <DrawerTrigger asChild>
        <div className="flex flex-col gap-2">
          {/* 6 because we decide to show the first 6 participants avatars as preview */}
          <UsersAvatarsPreview
            users={
              participants.length > 6 ? participants.slice(0, 6) : participants
            }
          />
          <UsersNamesPreview usersAddresses={participants} />
        </div>
      </DrawerTrigger>

      <DrawerContent className="min-h-[350px] max-h-[680px]">
        <DrawerHeader className="text-left">
          <DialogTitle>{t("participants-list")}</DialogTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 px-4 pb-4 max-h-full overflow-auto">
          {participants.map((participantId) => {
            return (
              <UserAvatarWithName
                key={participantId}
                userId={participantId}
                className="h-10 py-1"
                linkToProfile
              />
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import React, { useState } from "react";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { eventUsersWithRole } from "@/lib/queries/event-users";
import { UserAvatar, UserAvatarWithName } from "@/components/common/user";
import Text from "@/components/texts/text";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/shadcn/drawer";

function ParticipantsAvatarsPreview({
  participants,
}: {
  participants: string[];
}) {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {participants.map((address) => (
        <UserAvatar
          key={address}
          className="flex ring-2 ring-background/80"
          address={address}
        />
      ))}
    </div>
  );
}

function ParticipantsNamesPreview({
  participants: participantsAddresses,
}: {
  participants: string[];
}) {
  const participants = useSuspenseQueries({
    queries: participantsAddresses.map((address) => profileOptions(address)),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<GnoProfile, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => elem.data),
  });
  return (
    <div className="flex flex-row">
      {participants.length > 2 ? (
        <>
          <Text
            size="sm"
            className="text-start"
          >{`${participants[0]?.displayName}, ${participants[1]?.displayName} and ${participants.length - 2} others`}</Text>
        </>
      ) : (
        <Text size="sm">
          {participants
            .map((participant) => participant?.displayName)
            .join(", ")}
        </Text>
      )}
    </div>
  );
}

export function ParticipantsSection({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { data: participantsAddresses } = useSuspenseQuery(
    eventUsersWithRole(id, "participant"),
  );
  const t = useTranslations("event");
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
              <ParticipantsAvatarsPreview
                participants={
                  participantsAddresses.length > 6
                    ? participantsAddresses.slice(0, 6)
                    : participantsAddresses
                }
              />
              <ParticipantsNamesPreview participants={participantsAddresses} />
            </div>
          </DialogTrigger>
          <DialogContent className="max-h-screen overflow-auto">
            <DialogHeader>
              <DialogTitle>{t("participants-list")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {participantsAddresses.map((address) => {
                return (
                  <UserAvatarWithName
                    key={address}
                    address={address}
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <div className="flex flex-col gap-2">
          {/* 6 because we decide to show the first 6 participants avatars as preview */}
          <ParticipantsAvatarsPreview
            participants={
              participantsAddresses.length > 6
                ? participantsAddresses.slice(0, 6)
                : participantsAddresses
            }
          />
          <ParticipantsNamesPreview participants={participantsAddresses} />
        </div>
      </DrawerTrigger>

      <DrawerContent className="min-h-[350px] max-h-[680px]">
        <DrawerHeader className="text-left">
          <DialogTitle>{t("participants-list")}</DialogTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 px-4 pb-4 max-h-full overflow-auto">
          {participantsAddresses.map((address) => {
            return (
              <UserAvatarWithName
                key={address}
                address={address}
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

"use client";

import React from "react";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { SmallText } from "@/components/texts/SmallText";
import { GnowebButton } from "@/components/buttons/GnowebButton";
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
        <div>
          <SmallText>{`${participants[0]?.displayName}, ${participants[1]?.displayName} and ${participants.length - 2} others`}</SmallText>
        </div>
      ) : (
        <div>
          {participants.map((participant) => (
            <SmallText key={participant?.address}>
              {participant?.displayName}
            </SmallText>
          ))}
        </div>
      )}
    </div>
  );
}

export function ParticipantsSection({ id }: { id: string }) {
  const { data: participantsAddresses } = useSuspenseQuery(
    eventUsersWithRole(id, "participant"),
  );

  return (
    <div className="flex flex-col gap-5">
      <Dialog>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participants list</DialogTitle>
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
      <GnowebButton
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${id}`}
      />
    </div>
  );
}

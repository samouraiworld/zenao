"use client";

import React from "react";
import Link from "next/link";
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { SmallText } from "@/components/texts/SmallText";
import { GnowebButton } from "@/components/buttons/GnowebButton";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";
import { Avatar } from "@/components/common/Avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { eventUsersWithRole } from "@/lib/queries/event-users";

function ParticipantsAvatarsPreview({
  participants,
}: {
  participants: (GnoProfile | null)[];
}) {
  return (
    <div className="flex p-1 -space-x-2 overflow-hidden">
      {participants &&
        participants.map((participant) => (
          <Avatar
            key={participant?.address}
            className="flex ring-2 ring-background/80"
            uri={participant?.avatarUri || ""}
          />
        ))}
    </div>
  );
}

function ParticipantsNamesPreview({
  participants,
}: {
  participants: (GnoProfile | null)[];
}) {
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
  const participants = useSuspenseQueries({
    queries: participantsAddresses.map((address) => profileOptions(address)),
    combine: (results) => {
      if (results.some((item) => !item.isSuccess)) {
        return;
      }
      return results.map((item) => item.data);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {participants && (
        <Dialog>
          <DialogTrigger>
            <div className="flex flex-col gap-2">
              {/* 6 because we decide to show the first 6 participants avatars as preview */}
              <ParticipantsAvatarsPreview
                participants={
                  participants.length > 6
                    ? participants.slice(0, 6)
                    : participants
                }
              />
              <ParticipantsNamesPreview participants={participants} />
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Participants list</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {participants.map((participant) => {
                if (!participant) {
                  return null;
                }
                return (
                  <Link
                    href={`/profile/${participant.address}`}
                    key={participant?.displayName}
                  >
                    <div className="flex h-10 p-1 flex-row gap-3 items-center">
                      <Avatar uri={participant.avatarUri} />
                      <SmallText>{participant?.displayName}</SmallText>
                    </div>
                  </Link>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
      <GnowebButton
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${id}`}
      />
    </div>
  );
}

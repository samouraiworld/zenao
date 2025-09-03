"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import Heading from "@/components/widgets/texts/heading";
import {
  communitiesListByMember,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { userAddressOptions } from "@/lib/queries/user";
import { EventFormSchemaType } from "@/types/schemas";

export default function EventFormCommunitySelector({
  form,
}: {
  form: UseFormReturn<EventFormSchemaType>;
}) {
  // Community selection
  const { userId, getToken } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: userCommunitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByMember(userAddress, DEFAULT_COMMUNITIES_LIMIT),
  );
  // Filter only communities where user is administrator
  const selectableCommunities = useMemo(() => {
    return (userCommunitiesPages?.pages.flat() ?? []).filter((c) =>
      c.administrators.includes(userAddress!),
    );
  }, [userCommunitiesPages, userAddress]);

  return (
    <div className="flex flex-col gap-4">
      <Heading level={3}>Link event to one your community :</Heading>

      <Select onValueChange={(e) => form.setValue("communityId", e)}>
        <SelectTrigger>
          <SelectValue placeholder="-- Select a community --" />
        </SelectTrigger>
        <SelectContent>
          {selectableCommunities.map((community) => (
            <SelectItem key={community.pkgPath} value={community.pkgPath}>
              {community.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

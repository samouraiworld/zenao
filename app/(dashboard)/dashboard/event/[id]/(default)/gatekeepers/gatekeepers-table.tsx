"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useTransition } from "react";
import { eventGatekeepersEmails } from "@/lib/queries/event";
import { userInfoOptions } from "@/lib/queries/user";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { eventUserRoles } from "@/lib/queries/event-users";
import { useGatekeepersColumns } from "@/components/features/dashboard/event-details/columns";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import Text from "@/components/widgets/texts/text";
import { AddGatekeeperForm } from "@/components/features/dashboard/event-details/gatekeepers/add-gatekeeper-form";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { makeLocationFromEvent } from "@/lib/location";
import { EventFormSchemaType } from "@/types/schemas";

interface GatekeepersTableProps {
  eventId: string;
  eventInfo: EventInfo;
}

export default function GatekeepersTable({
  eventId,
  eventInfo,
}: GatekeepersTableProps) {
  const { getToken, userId } = useAuth();

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.realmId),
  );
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );

  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId =
    communities.length > 0
      ? communityIdFromPkgPath(communities[0].pkgPath)
      : null;

  const location = makeLocationFromEvent(eventInfo.location);

  const [isPending, startTransition] = useTransition();
  const onDelete = (email: string) => {
    startTransition(async () => {
      const newGatekeepers = gatekeepers.gatekeepers.filter(
        (gatekeeperEmail) => gatekeeperEmail !== email,
      );

      const values: EventFormSchemaType = {
        ...eventInfo,
        location,
        gatekeepers: newGatekeepers.map((gatekeeperEmail) => ({
          email: gatekeeperEmail,
        })),
        exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
        password: "",
        communityId: communityId || null,
      };

      console.log("Submitting:", values.gatekeepers);
    });
  };

  const columns = useGatekeepersColumns({
    onDelete,
  });
  const table = useDataTableInstance({
    data: gatekeepers.gatekeepers,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row,
  });

  if (!userRoles.includes("organizer")) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <AddGatekeeperForm
        eventId={eventId}
        eventInfo={eventInfo}
        gatekeepers={gatekeepers.gatekeepers}
      />
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">No gatekeepers found.</Text>
              </div>
            )}
          />
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

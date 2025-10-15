"use client";

import {
  useSuspenseQueries,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import Text from "../widgets/texts/text";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";

const numNames = 2;

function UsersNamesPreview({ usersAddresses }: { usersAddresses: string[] }) {
  const users = useSuspenseQueries({
    queries: usersAddresses.map((address) => profileOptions(address)),
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
      {users.length > numNames ? (
        <>
          <Text size="sm" className="text-start">{`${users
            .slice(0, numNames)
            .map((user) => user.displayName)
            .join(
              ", ",
            )} and ${users.length - numNames} other${users.length == numNames + 1 ? "" : "s"}`}</Text>
        </>
      ) : (
        <Text size="sm" className="break-all">
          {users.map((user) => user?.displayName).join(", ")}
        </Text>
      )}
    </div>
  );
}

export default UsersNamesPreview;

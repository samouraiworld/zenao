"use client";

import {
  useSuspenseQueries,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import Text from "../widgets/texts/text";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";

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
      {users.length > 2 ? (
        <>
          <Text
            size="sm"
            className="text-start"
          >{`${users[0]?.displayName}, ${users[1]?.displayName} and ${users.length - 2} others`}</Text>
        </>
      ) : (
        <Text size="sm">
          {users.map((user) => user?.displayName).join(", ")}
        </Text>
      )}
    </div>
  );
}

export default UsersNamesPreview;

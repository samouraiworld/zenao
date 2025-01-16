"use client";

import { FC } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { zenaoClient } from "../zenao-client";

export const CreateEventButton: FC = () => {
  const user = useUser();
  const { client } = useClerk();
  if (!user.isSignedIn) {
    return <p>Sign in to create event</p>;
  }
  return (
    <button
      onClick={async () => {
        const token = await client.activeSessions[0].getToken();
        if (!token) {
          throw new Error("invalid clerk token");
        }
        await zenaoClient.createEvent(
          {},
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          },
        );
        alert("Success");
      }}
    >
      Create Event
    </button>
  );
};

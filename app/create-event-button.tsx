"use client";

import { FC } from "react";
import { zenaoClient } from "./zenao-client";

export const CreateEventButton: FC = () => {
  return (
    <button
      onClick={async () => {
        await zenaoClient.createEvent({});
        alert("Success");
      }}
    >
      Create Event
    </button>
  );
};

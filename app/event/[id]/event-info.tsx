"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventOptions } from "@/lib/queries/event";

export function EventInfo({ id }: { id: string }) {
  const { data } = useSuspenseQuery(eventOptions(id));

  return (
    <div>
      <figure>
        <h2>{JSON.stringify(data)}</h2>
      </figure>
    </div>
  );
}

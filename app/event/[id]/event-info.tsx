"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { eventOptions } from "@/lib/queries/event";

export function EventInfo({ id }: { id: string }) {
  const { data } = useSuspenseQuery(eventOptions(id));

  return (
    <div>
      <figure>
        <Link href={`http://127.0.0.1:8888/r/zenao/events/e${id}`}>
          See on gnoweb
        </Link>
        <h2>{JSON.stringify(data)}</h2>
      </figure>
    </div>
  );
}

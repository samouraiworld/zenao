"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { eventOptions } from "@/lib/queries/event";

export function EventInfo({ id }: { id: string }) {
  const { data } = useSuspenseQuery(eventOptions(id));

  return (
    <div>
      <Link href={`http://127.0.0.1:8888/r/zenao/events/e${id}`}>
        See on gnoweb
      </Link>
      {data ? (
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
            {data.title}
          </h1>
          <Image
            src={data.imageUri}
            width={300}
            height={300}
            alt="Picture of the event"
          />
          <p>Desc: {data.description}</p>

          <p>
            {format(fromUnixTime(Number(data.startDate)), "PPPPpppp")} TO{" "}
            {format(fromUnixTime(Number(data.endDate)), "PPPPpppp")}
          </p>
          <p>Price: {data.ticketPrice}</p>
          <p>Capacity: {data.capacity}</p>
        </div>
      ) : null}
    </div>
  );
}

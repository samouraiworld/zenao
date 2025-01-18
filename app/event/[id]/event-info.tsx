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
    <div className="mx-28">
      {data ? (
        <div className="flex flex-row w-full h-full gap-10">
          <div className="flex flex-initial w-2/5 justify-end">
            <div className="flex flex-col">
              <Image
                src={data.imageUri}
                width={500}
                height={200}
                alt="imageUri"
              />
              <Link href={`http://127.0.0.1:8888/r/zenao/events/e${id}`}>
                See on gnoweb
              </Link>
              <p className="my-4">
                Add link here if you are the host and can directly navigate to
                the manage org event page
              </p>
              <p>Hosted by: </p>
            </div>
          </div>
          <div className="flex flex-initial w-3/5 flex-col justify-start gap-2">
            <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight mb-7">
              {data.title}
            </h1>
            <p className="mb-2">Desc: {data.description}</p>
            <p>
              Start Date:{" "}
              {format(fromUnixTime(Number(data.startDate)), "PPPPpppp")}
            </p>
            <p>
              End Date: {format(fromUnixTime(Number(data.endDate)), "PPPPpppp")}
            </p>
            <p>Price: {data.ticketPrice}</p>
            <p>Capacity: {data.capacity}</p>
          </div>
        </div>
      ) : (
        <p>{`Event doesn't exist`}</p>
      )}
    </div>
  );
}

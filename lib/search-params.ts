import { createLoader, parseAsStringLiteral } from "nuqs/server";

const fromFilter = ["upcoming", "past"] as const;

export type FromFilter = (typeof fromFilter)[number];

export const eventFilterSearchParams = {
  from: parseAsStringLiteral(fromFilter).withDefault("upcoming"),
};

export const loadEventFilterSearchParams = createLoader(
  eventFilterSearchParams,
);

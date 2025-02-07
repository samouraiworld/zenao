import { z } from "zod";

export function extractGnoJSONResponse(res: string): unknown {
  const jsonString = res.substring("(".length, res.length - " string)".length);
  // eslint-disable-next-line no-restricted-syntax
  const jsonStringContent = JSON.parse(jsonString);
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(jsonStringContent) as unknown;
}

export const eventInfoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUri: z.string().trim().min(1).url(),
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  capacity: z.coerce.number(),
  creatorAddr: z.string().trim().min(1),
  location: z.string().trim().min(1),
  participants: z.number(),
});

export type EventInfo = z.infer<typeof eventInfoSchema>;

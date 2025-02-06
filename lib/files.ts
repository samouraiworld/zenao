import { z } from "zod";

export const filesPostResponseSchema = z.object({
  uri: z.string(),
});

export type FilesPostResponse = z.infer<typeof filesPostResponseSchema>;

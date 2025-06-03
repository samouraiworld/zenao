import { z } from "zod";

export const filesPostResponseSchema = z.object({
  uri: z.string(),
});

export const uploadFile = async (file: File): Promise<string> => {
  const data = new FormData();
  data.set("file", file);
  const uploadRequest = await fetch("/api/files", {
    method: "POST",
    body: data,
  });
  const resRaw = await uploadRequest.json();
  const res = filesPostResponseSchema.parse(resRaw);

  return res.uri;
};

export type FilesPostResponse = z.infer<typeof filesPostResponseSchema>;

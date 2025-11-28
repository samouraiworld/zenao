import { z } from "zod";

export const filesPostResponseSchema = z.object({
  uri: z.string(),
});

export const uploadFile = async (
  file: File,
  sizeLimit?: number,
): Promise<string> => {
  if (sizeLimit && file.size > sizeLimit) {
    throw new Error(`File size exceeds limit: ${sizeLimit} bytes`);
  }

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

export const uploadJSON = async (
  json: unknown,
  sizeLimit?: number,
): Promise<string> => {
  const blob = new Blob([Buffer.from(JSON.stringify(json))], {
    type: "application/json",
  });
  return uploadBlob(blob, sizeLimit);
};

export const uploadBlob = async (
  blob: Blob,
  sizeLimit?: number,
): Promise<string> => {
  if (sizeLimit && blob.size > sizeLimit) {
    throw new Error(`File size exceeds limit: ${sizeLimit} bytes`);
  }

  const data = new FormData();
  data.set("file", blob);
  const uploadRequest = await fetch("/api/files", {
    method: "POST",
    body: data,
  });
  const resRaw = await uploadRequest.json();
  const res = filesPostResponseSchema.parse(resRaw);

  return res.uri;
};

export const uploadString = async (
  str: string,
  sizeLimit?: number,
): Promise<string> => {
  const blob = new Blob([Buffer.from(str)], { type: "text/plain" });
  return uploadBlob(blob, sizeLimit);
};

export type FilesPostResponse = z.infer<typeof filesPostResponseSchema>;

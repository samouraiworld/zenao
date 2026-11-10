import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { z } from "zod";

export const filesPostResponseSchema = z.object({
  uri: z.string(),
});

export type FilesPostResponse = z.infer<typeof filesPostResponseSchema>;

const uploadEndpoint = `${
  process.env.NEXT_PUBLIC_ZENAO_BACKEND_ENDPOINT || "http://localhost:4242"
}/files`;

export const uploadFile = async (
  file: File,
  token: string | null,
  sizeLimit?: number,
): Promise<string> => {
  if (sizeLimit && file.size > sizeLimit) {
    throw new Error(`File size exceeds limit: ${sizeLimit} bytes`);
  }
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = new FormData();
  data.set("file", file);
  const uploadRequest = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: data,
  });
  const resRaw = await uploadRequest.json();
  const res = filesPostResponseSchema.parse(resRaw);

  return res.uri;
};

// useUploadFile returns a function that uploads a file to IPFS through the
// backend, as the signed-in user, and resolves to its ipfs:// URI.
export const useUploadFile = () => {
  const { getToken } = useAuth();
  return useCallback(
    async (file: File, sizeLimit?: number) =>
      uploadFile(file, await getToken(), sizeLimit),
    [getToken],
  );
};

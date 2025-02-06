"server only";

import { PinataSDK } from "pinata-web3";
import { z } from "zod";

export const pinata = new PinataSDK({
  pinataJwt: `${process.env.PINATA_JWT}`,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`,
});

export const uploadResponseSchema = z.object({
  uri: z.string(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const web2URL = (uri: string) => {
  if (!uri.startsWith("ipfs://")) {
    return uri;
  }
  const withoutScheme = uri.substring("ipfs://".length);
  const res = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${withoutScheme}`;
  return res;
};

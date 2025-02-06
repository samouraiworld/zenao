import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidURL = (url: string, urlPattern: RegExp) => {
  if (url.startsWith("ipfs://")) {
    return true;
  }
  const urlRegex = new RegExp(urlPattern);
  return urlRegex.test(url);
};

export const web2URLToIpfsURI = (web2URL: string) => {
  const separatorIndex = web2URL.lastIndexOf("/");
  const cidString = web2URL.substring(separatorIndex + 1);
  return `ipfs://${cidString}`;
};

export const ipfsURIToWeb2URL = (ipfsURI: string) => {
  if (!ipfsURI.startsWith("ipfs://")) {
    return ipfsURI;
  }
  const separatorIndex = ipfsURI.lastIndexOf("/");
  const cidString = ipfsURI.substring(separatorIndex + 1);
  return `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cidString}`;
};

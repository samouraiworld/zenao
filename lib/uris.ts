export const isValidURL = (url: string, urlPattern: RegExp) => {
  if (url.startsWith("ipfs://")) {
    return true;
  }
  const urlRegex = new RegExp(urlPattern);
  return urlRegex.test(url);
};

// Public IPFS gateway that serves ipfs:// URIs (scheme included, no trailing slash).
export const ipfsGatewayURL = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || "https://ipfs.zenao.io"
).replace(/\/+$/, "");

export const web2URL = (uri: string) => {
  if (!uri.startsWith("ipfs://")) {
    return uri;
  }
  const withoutScheme = uri.substring("ipfs://".length);
  const res = `${ipfsGatewayURL}/ipfs/${withoutScheme}`;
  return res;
};

export const isValidURL = (url: string, urlPattern: RegExp) => {
  if (url.startsWith("ipfs://")) {
    return true;
  }
  const urlRegex = new RegExp(urlPattern);
  return urlRegex.test(url);
};

export const web2URL = (uri: string) => {
  if (!uri.startsWith("ipfs://")) {
    return uri;
  }
  const withoutScheme = uri.substring("ipfs://".length);
  const res = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${withoutScheme}`;
  return res;
};

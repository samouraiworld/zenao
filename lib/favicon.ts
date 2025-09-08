export const getFaviconUrl = (url: string) => {
  let icon = "";
  try {
    const encodedUrl = new URL(url);
    icon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodedUrl}&size=24`;
  } catch {
    icon = "";
  }
  return icon;
};

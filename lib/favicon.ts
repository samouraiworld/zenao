export const getFaviconUrl = (url: string) => {
  let icon = "";
  try {
    icon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=24`;
  } catch {
    icon = "";
  }
  return icon;
};

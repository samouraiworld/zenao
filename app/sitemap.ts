import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: "https://zenao.io",
    },
    {
      url: "https://zenao.io/discover",
    },
    {
      url: "https://zenao.io/manifesto",
    },
  ];
}

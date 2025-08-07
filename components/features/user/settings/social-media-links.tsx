"use client";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { SocialLinksSchemaType } from "@/types/schemas";

const SOCIAL_LINKS_KEYS = [
  "twitter",
  "github",
  "website",
  "discord",
  "telegram",
  "linkedin",
] as const;

function getUndefinedSocialLinkKeys(
  socialLinks: SocialLinksSchemaType,
): (typeof SOCIAL_LINKS_KEYS)[number][] {
  return SOCIAL_LINKS_KEYS.filter((key) => !socialLinks[key]);
}

const testObject: SocialLinksSchemaType = {
  twitter: "https://twitter.com/example",
  website: "",
};

function SocialMediaLinks() {
  const notSetSocialLinksKeys = getUndefinedSocialLinkKeys(testObject);

  return (
    <div className="flex gap-2">
      <Select>
        <SelectTrigger className="w-[180px] h-full">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {notSetSocialLinksKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Input type="text" placeholder="Enter URL" />
    </div>
  );
}

export default SocialMediaLinks;

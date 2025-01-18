"use client";

import { FacebookIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="flex flex-row justify-between items-end p-4">
      <div className="flex flex-row gap-3 sm:gap-5">
        <p className="text-sm dark:text-[#808080] underline underline-offset-1">
          Terms
        </p>
        <p className="text-sm dark:text-[#808080] underline underline-offset-1">
          Privacy
        </p>
        <p className="text-sm dark:text-[#808080] underline underline-offset-1">
          Security
        </p>
      </div>
      <div className="flex flex-row gap-3 sm:gap-5">
        <TwitterIcon className="h-5 w-5" />
        <FacebookIcon className="h-5 w-5" />
        <LinkedinIcon className="h-5 w-5" />
      </div>
    </footer>
  );
};

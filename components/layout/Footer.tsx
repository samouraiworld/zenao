import { FacebookIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="flex flex-row justify-between p-4">
      <div className="flex flex-row gap-5">
        <p>Terms</p>
        <p>Privacy</p>
        <p>Security</p>
      </div>
      <div className="flex flex-row gap-5">
        <TwitterIcon className="h-6 w-6" />
        <FacebookIcon className="h-6 w-6" />
        <LinkedinIcon className="h-6 w-6" />
      </div>
    </footer>
  );
};

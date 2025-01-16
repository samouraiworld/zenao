import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import { ToggleThemeButton } from "./buttons/ToggleThemeButton";

export const Header: React.FC = () => {
  return (
    <div className="flex flex-row justify-between p-2">
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <ToggleThemeButton />
    </div>
  );
};

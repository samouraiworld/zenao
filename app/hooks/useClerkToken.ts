"use client";

import { useClerk } from "@clerk/nextjs";
import React from "react";

export const useClerkToken = () => {
  const { session } = useClerk();
  const [clerkToken, setClerkToken] = React.useState<string>();

  React.useEffect(() => {
    const effect = async () => {
      if (!session) {
        return null;
      }
      const token = await session.getToken();
      if (!token) {
        return;
      }
      setClerkToken(token);
    };
    effect();
  }, [session]);

  return clerkToken;
};

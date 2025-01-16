"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// https://github.com/shadcn-ui/ui/issues/5552#issuecomment-2435053678
// Related issue that propose a fix for hydration error

const NextThemesProvider = dynamic(
  () => import("next-themes").then((e) => e.ThemeProvider),
  {
    ssr: false,
  },
);

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Button } from "@/components/shadcn/button";
import Text from "@/components/texts/text";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);
  return (
    <ScreenContainer>
      <div className="flex flex-col gap-2">
        <Text>{`Event doesn't exist`}</Text>
        <Link href="/discover">
          <Button>View other events</Button>
        </Link>
      </div>
    </ScreenContainer>
  );
}

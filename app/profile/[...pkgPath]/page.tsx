import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";

type Props = {
  params: Promise<{ pkgPath: string[] }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export default async function ProfilePage({ params }: Props) {
  const queryClient = getQueryClient();
  const { pkgPath: pkgPathUnsafe } = await params;

  let pkgPath: string;

  const isValidPkgPath =
    /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}(\/[a-z0-9\-_]+)+$/.test(
      pkgPathUnsafe.join("/"),
    );

  if (isValidPkgPath) {
    pkgPath = pkgPathUnsafe.join("/");
  } else {
    notFound();
  }

  queryClient.prefetchQuery(profileOptions(pkgPath));
  const now = Date.now() / 1000;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <ProfileInfo pkgPath={pkgPath} now={now} />
      </ScreenContainer>
    </HydrationBoundary>
  );
}

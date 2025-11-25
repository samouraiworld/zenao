import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import {
  communitiesList,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import Heading from "@/components/widgets/texts/heading";

export const revalidate = 600;

type CommunitiesLayoutProps = {
  children: React.ReactNode;
};

async function CommunitiesLayout({ children }: CommunitiesLayoutProps) {
  const queryClient = getQueryClient();

  queryClient.prefetchInfiniteQuery(communitiesList(DEFAULT_COMMUNITIES_LIMIT));

  const t = await getTranslations("community");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <div className="flex flex-col gap-12 mb-3">
          <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:justify-between md:items-center">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <Heading level={1} size="4xl" className="truncate">
                {t("communities")}
              </Heading>
              <GnowebButton
                href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/communityreg`}
              />
            </div>
          </div>
          {children}
        </div>
      </ScreenContainer>
    </HydrationBoundary>
  );
}

export default CommunitiesLayout;

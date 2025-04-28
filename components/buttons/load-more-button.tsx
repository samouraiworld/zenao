"use client";

import {
  FetchNextPageOptions,
  InfiniteData,
  InfiniteQueryObserverResult,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ButtonWithChildren } from "./ButtonWithChildren";
import Text from "../texts/text";

export function LoaderMoreButton<TData = unknown[]>({
  fetchNextPage,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  page,
  noMoreLabel,
}: {
  fetchNextPage: (
    options?: FetchNextPageOptions | undefined,
  ) => Promise<
    InfiniteQueryObserverResult<InfiniteData<TData[], unknown>, Error>
  >;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  page: unknown[];
  noMoreLabel: string;
}) {
  const t = useTranslations();
  return (
    <div className="flex justify-center">
      {hasNextPage ? (
        <ButtonWithChildren
          loading={isFetchingNextPage}
          onClick={async () => {
            await fetchNextPage();
          }}
        >
          {t("load-more")}
        </ButtonWithChildren>
      ) : (
        !isFetching &&
        page.length > 0 && (
          <Text size="sm" variant="secondary">
            {noMoreLabel}
          </Text>
        )
      )}
    </div>
  );
}

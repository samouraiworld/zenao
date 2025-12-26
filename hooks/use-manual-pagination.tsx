import { useCallback, useMemo } from "react";

interface UseManualPaginationProps {
  page: number;
  onPageChange: (page: number) => void;
  getHasNextPage: (page: number) => boolean;
  getHasPreviousPage: (page: number) => boolean;
}

interface UseManualPaginationReturn {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
}

export default function useManualPagination({
  getHasNextPage,
  getHasPreviousPage,
  onPageChange,
  page,
}: UseManualPaginationProps): UseManualPaginationReturn {
  const hasNextPage = useMemo(
    () => getHasNextPage(page),
    [page, getHasNextPage],
  );
  const hasPreviousPage = useMemo(
    () => getHasPreviousPage(page),
    [page, getHasPreviousPage],
  );

  const fetchNextPage = useCallback(() => {
    if (hasNextPage) {
      onPageChange(page + 1);
    }
  }, [hasNextPage, onPageChange, page]);

  const fetchPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      onPageChange(page - 1);
    }
  }, [hasPreviousPage, onPageChange, page]);

  return {
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
  };
}

import { RefObject, useEffect, useState } from "react";

export const useIsLinesTruncated = (
  containerRef: RefObject<HTMLDivElement | null>,
  lineClamp: number,
) => {
  const [isDescTruncated, setDescTruncated] = useState(false);
  const [truncatedMaxHeight, setTruncatedMinHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.scrollHeight;
      const lineHeight = parseInt(
        window.getComputedStyle(containerRef.current).lineHeight,
        10,
      );
      const mHeight = lineClamp * lineHeight;
      setTruncatedMinHeight(mHeight);
      setDescTruncated(containerHeight > mHeight);
    }
  }, [containerRef, lineClamp]);
  return { truncatedMaxHeight, isDescTruncated };
};

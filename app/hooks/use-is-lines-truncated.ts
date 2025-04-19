import { RefObject, useEffect, useState } from "react";

export const useIsLinesTruncated = (
  containerRef: RefObject<HTMLDivElement | null>,
  lineClamp: number,
) => {
  const [isDescTruncated, setDescTruncated] = useState(false);
  useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.scrollHeight;
      const lineHeight = parseInt(
        window.getComputedStyle(containerRef.current).lineHeight,
        10,
      );
      const maxHeight = lineClamp * lineHeight;
      setDescTruncated(containerHeight > maxHeight);
    }
  }, [containerRef, lineClamp]);
  return isDescTruncated;
};

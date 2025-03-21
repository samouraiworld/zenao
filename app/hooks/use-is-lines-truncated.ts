import { RefObject, useEffect, useState } from "react";

export const useIsLinesTruncated = (
  containerRef: RefObject<HTMLDivElement | null>,
  lineClamp: number,
) => {
  const [isTruncated, setIsTruncated] = useState(false);
  useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.scrollHeight;
      const lineHeight = parseInt(
        window.getComputedStyle(containerRef.current).lineHeight,
        10,
      );
      const maxHeight = lineClamp * lineHeight;
      setIsTruncated(containerHeight > maxHeight);
    }
  }, [containerRef, lineClamp]);
  return isTruncated;
};

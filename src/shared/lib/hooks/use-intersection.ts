"use client";

import { useEffect, useRef, useState } from "react";

type UseIntersectionParams = {
  enabled?: boolean;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  onIntersect: (entry: IntersectionObserverEntry) => void;
};

export function useIntersection<T extends Element>({
  enabled = true,
  root = null,
  rootMargin = "0px",
  threshold = 0,
  onIntersect,
}: UseIntersectionParams) {
  const [target, setTarget] = useState<T | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled || !target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          onIntersectRef.current(firstEntry);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, root, rootMargin, target, threshold]);

  return setTarget;
}

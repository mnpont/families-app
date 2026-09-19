import { useLayoutEffect, useState, type RefObject } from 'react';

interface UseFitTextOptions {
  maxFontSize: number;
  minFontSize?: number;
  /**
   * Also shrink if the wrapped text would be taller than the container has
   * room for (accounting for sibling elements and gaps in the container's
   * flex layout). Only meaningful when the container has a bounded/fixed
   * height -- e.g. the flashcard face, but not a page that just grows.
   */
  checkHeight?: boolean;
}

/**
 * Shrinks an element's font-size until its text fits its container --
 * without needing to break a word mid-way, and (with `checkHeight`) without
 * its wrapped lines exceeding the vertical space actually available. Falls
 * back to allowing a break (via the returned `overflowing` flag) only if
 * even `minFontSize` still doesn't fit.
 */
export function useFitText<T extends HTMLElement>(
  ref: RefObject<T | null>,
  text: string | null | undefined,
  { maxFontSize, minFontSize = 14, checkHeight = false }: UseFitTextOptions,
) {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) {
      setFontSize(maxFontSize);
      setOverflowing(false);
      return;
    }

    const measure = () => {
      const containerStyle = getComputedStyle(container);
      const availableWidth =
        container.clientWidth -
        parseFloat(containerStyle.paddingLeft) -
        parseFloat(containerStyle.paddingRight);

      let availableHeight = Infinity;
      if (checkHeight) {
        const paddingY =
          parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
        const gap = parseFloat(containerStyle.rowGap || containerStyle.gap || '0') || 0;
        const children = Array.from(container.children) as HTMLElement[];
        const siblingsHeight = children
          .filter((child) => child !== el)
          .reduce((sum, child) => sum + child.offsetHeight, 0);
        const gapsTotal = gap * Math.max(children.length - 1, 0);
        availableHeight = container.clientHeight - paddingY - siblingsHeight - gapsTotal;
      }

      const fits = () => el.scrollWidth <= availableWidth && el.scrollHeight <= availableHeight;

      let size = maxFontSize;
      el.style.fontSize = `${size}px`;

      while (size > minFontSize && !fits()) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
      setOverflowing(!fits());
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ref, text, maxFontSize, minFontSize, checkHeight]);

  return { fontSize, overflowing };
}

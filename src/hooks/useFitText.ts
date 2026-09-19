import { useLayoutEffect, useState, type RefObject } from 'react';

interface UseFitTextOptions {
  maxFontSize: number;
  minFontSize?: number;
}

/**
 * Shrinks an element's font-size until its text fits the width of its
 * parent without needing to break a word mid-way. Falls back to allowing a
 * break (via the returned `overflowing` flag) only if even `minFontSize`
 * can't make a single word fit.
 */
export function useFitText<T extends HTMLElement>(
  ref: RefObject<T | null>,
  text: string | null | undefined,
  { maxFontSize, minFontSize = 14 }: UseFitTextOptions,
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

      let size = maxFontSize;
      el.style.fontSize = `${size}px`;

      while (size > minFontSize && el.scrollWidth > availableWidth) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
      setOverflowing(el.scrollWidth > availableWidth);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ref, text, maxFontSize, minFontSize]);

  return { fontSize, overflowing };
}

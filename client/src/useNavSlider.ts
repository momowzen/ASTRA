import { useEffect, useRef, type RefObject } from 'react';

export interface NavSlider {
  /** The scrolling list that holds the `.nav-item` buttons. */
  containerRef: RefObject<HTMLDivElement>;
  /** The shared highlight that glides between them. */
  sliderRef: RefObject<HTMLSpanElement>;
}

/**
 * Sliding tab highlight for the sidebar menu.
 *
 * Rather than styling each `.nav-item.active` in place (which would make the
 * marker jump), a single element is measured against the active item and
 * moved with a CSS transition, so the highlight glides to the clicked tab.
 *
 * Re-measures whenever the active class moves, when items are added or
 * removed (tabs load asynchronously), and when either the container or an
 * item changes size.
 */
export function useNavSlider(): NavSlider {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);
  // The very first placement must not animate in from nowhere.
  const untouched = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const slider = sliderRef.current;
    if (!container || !slider) return;

    const items = () => Array.from(container.querySelectorAll<HTMLElement>('.nav-item'));

    const place = () => {
      const active = container.querySelector<HTMLElement>('.nav-item.active');
      if (!active) {
        slider.style.opacity = '0';
        return;
      }

      const height = active.offsetHeight;
      const top = active.offsetTop;

      if (untouched.current) {
        untouched.current = false;
        slider.classList.add('is-idle');
        slider.style.opacity = '1';
        slider.style.height = `${height}px`;
        slider.style.transform = `translateY(${top}px)`;
        // Two frames: the idle placement has to paint before the
        // transition is handed back to the stylesheet.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => slider.classList.remove('is-idle')),
        );
        return;
      }

      slider.style.opacity = '1';
      slider.style.height = `${height}px`;
      slider.style.transform = `translateY(${top}px)`;
    };

    place();

    const observer = new ResizeObserver(() => place());
    observer.observe(container);
    for (const item of items()) observer.observe(item);

    // Active class moves and items loading in don't resize the container,
    // so watch the DOM directly as well.
    const dom = new MutationObserver(() => {
      place();
      for (const item of items()) observer.observe(item);
    });
    dom.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    const onScroll = () => place();
    const onResize = () => place();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      dom.disconnect();
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { containerRef, sliderRef };
}

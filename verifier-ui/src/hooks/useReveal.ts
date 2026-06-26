import { useEffect } from 'react';

/** Scroll-reveal with staggered groups. Elements with [data-reveal] fade up on entry. */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('shown');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
      group.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el, i) => {
        el.style.setProperty('--rd', `${i * 70}ms`);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

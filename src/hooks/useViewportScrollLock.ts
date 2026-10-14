import { useEffect } from 'react';

/**
 * Locks vertical page scrolling when `locked` is true (e.g., before the user clicks "İncele"),
 * and restores normal vertical scrolling as soon as `locked` becomes false or the component unmounts.
 */
export function useViewportScrollLock(locked: boolean): void {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (locked) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      html.style.overflow = 'hidden';
      html.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.height = '100dvh';
      body.style.overscrollBehavior = 'none';
    } else {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      body.style.overscrollBehavior = '';
    }

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      body.style.overscrollBehavior = '';
    };
  }, [locked]);
}

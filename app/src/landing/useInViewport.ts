import { useEffect, useState } from 'react';

interface ViewportState {
  /** True while the element intersects the viewport (and document tab is visible) */
  inView: boolean;
  /** Becomes true once the element first comes within rootMargin and stays true */
  hasEntered: boolean;
}

/**
 * Tracks element visibility and tab visibility so off-screen WebGL scenes
 * can lazy-mount near the viewport and pause their render loop when unseen.
 */
export function useInViewport(
  ref: React.RefObject<Element | null>,
  rootMargin = '200px 0px',
): ViewportState {
  const [intersecting, setIntersecting] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIntersecting(true);
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        setIntersecting(isVisible);
        if (isVisible) setHasEntered(true);
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return {
    inView: intersecting && tabVisible,
    hasEntered,
  };
}

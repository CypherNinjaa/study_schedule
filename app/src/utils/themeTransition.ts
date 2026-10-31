import { flushSync } from 'react-dom';
import type { ThemeMode } from '@/types';
import { updateSettings } from '@/store/actions';
import { useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';

type OriginLike =
  | { x: number; y: number }
  | React.MouseEvent<HTMLElement>
  | MouseEvent
  | null
  | undefined;

/**
 * Transitions between light and dark themes using the View Transitions API
 * with a circular expanding ripple effect anchored at the click coordinates.
 * Inspired by harshitr.me.
 */
export function toggleThemeWithTransition(
  targetTheme: ThemeMode,
  origin?: OriginLike,
) {
  let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  if (origin) {
    if (
      'currentTarget' in origin &&
      origin.currentTarget &&
      typeof (origin.currentTarget as HTMLElement).getBoundingClientRect === 'function'
    ) {
      const rect = (origin.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if ('clientX' in origin && typeof origin.clientX === 'number' && origin.clientX > 0) {
      x = origin.clientX;
      y = origin.clientY;
    } else if ('x' in origin && typeof origin.x === 'number') {
      x = origin.x;
      y = origin.y;
    }
  }

  // Set the CSS variables for the circle reveal center
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--theme-x', `${Math.round(x)}px`);
    document.documentElement.style.setProperty('--theme-y', `${Math.round(y)}px`);
  }

  const hasViewTransition =
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as unknown as { startViewTransition: unknown }).startViewTransition === 'function';

  const prefersReduced =
    typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.reduceMotion === 'true' ||
      useDataStore.getState().data?.settings.reduceMotion === true);

  const applyChanges = () => {
    updateSettings({ theme: targetTheme });
    useUiStore.getState().applyTheme(targetTheme);
  };

  if (hasViewTransition && !prefersReduced) {
    (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
      flushSync(() => {
        applyChanges();
      });
    });
  } else {
    // Graceful fallback with smooth color transitions
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transitioning');
      applyChanges();
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
    } else {
      applyChanges();
    }
  }
}


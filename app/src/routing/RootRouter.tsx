import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  detectCompletedSetup,
  hasEnteredStudyOSInSession,
  hasFastSetupFlag,
  markEnteredStudyOS,
} from './setupStatus';

const StudyOSApp = lazy(() => import('@/App'));
const LandingPage = lazy(() => import('@/landing/LandingPage'));

type SurfaceRoute = 'landing' | 'studyos';

function resolvePathRoute(pathname: string): SurfaceRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/studyos' || normalized.startsWith('/studyos/')) {
    return 'studyos';
  }
  return 'landing';
}

function isExplicitLaunchIntent(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('launch') === '1';
  } catch {
    return false;
  }
}

function isExplicitLandingView(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('landing') === '1' || params.get('home') === '1';
  } catch {
    return false;
  }
}

function RouteFallback({ dark }: { dark?: boolean }) {
  return (
    <div
      className={
        dark
          ? 'flex min-h-screen items-center justify-center bg-[#131416] text-[#9A968D]'
          : 'flex min-h-screen items-center justify-center bg-[#FBFBF9] text-[#5C5952]'
      }
    >
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="h-2 w-2 rounded-full bg-[#D97706] animate-pulse" />
        <span>Loading Study Schedule…</span>
      </div>
    </div>
  );
}

/**
 * Top-level route boundary separating the Apple-inspired 3D marketing landing page (`/`)
 * from the core StudyOS application (`/studyos`).
 *
 * Redirect rules:
 * - Returning user (setup completed) visiting `/` -> redirected to `/studyos`
 *   (unless `?landing=1` is explicitly passed so returning users can still view the homepage).
 * - New user (no setup completed) visiting `/` -> stays on the landing page.
 * - New user clicking Get Started / Launch StudyOS -> enters `/studyos` onboarding.
 * - New user navigating directly to `/studyos` without prior setup or landing CTA -> redirected to `/`.
 */
export function RootRouter() {
  const [route, setRoute] = useState<SurfaceRoute>(() => {
    const initial = resolvePathRoute(window.location.pathname);
    if (initial === 'studyos' && isExplicitLaunchIntent()) {
      markEnteredStudyOS();
      window.history.replaceState(null, '', `/studyos/${window.location.hash}`);
      return 'studyos';
    }
    if (initial === 'landing' && !isExplicitLandingView() && hasFastSetupFlag()) {
      window.history.replaceState(null, '', `/studyos/${window.location.hash}`);
      return 'studyos';
    }
    return initial;
  });

  const [checkingSetup, setCheckingSetup] = useState<boolean>(() => {
    // If already fast-flagged as onboarded or viewing explicit ?landing=1, no async gate needed
    if (hasFastSetupFlag()) return false;
    if (isExplicitLandingView()) return false;
    // If new visitor clicked Get Started in this session, allow /studyos immediately
    if (resolvePathRoute(window.location.pathname) === 'studyos' && hasEnteredStudyOSInSession()) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      const currentRoute = resolvePathRoute(window.location.pathname);
      const explicitLanding = isExplicitLandingView();
      const hasSetup = await detectCompletedSetup();
      if (cancelled) return;

      if (currentRoute === 'landing') {
        if (hasSetup && !explicitLanding) {
          window.history.replaceState(null, '', `/studyos${window.location.hash}`);
          setRoute('studyos');
        } else {
          setRoute('landing');
        }
      } else {
        // currentRoute === 'studyos'
        if (hasSetup || hasEnteredStudyOSInSession()) {
          setRoute('studyos');
        } else {
          window.history.replaceState(null, '', '/');
          setRoute('landing');
        }
      }
      setCheckingSetup(false);
    };

    if (checkingSetup) {
      void evaluate();
    }

    const onPopState = () => {
      setRoute(resolvePathRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', onPopState);
    };
  }, [checkingSetup]);

  const handleLaunchStudyOS = useCallback(() => {
    markEnteredStudyOS();
    window.history.pushState(null, '', '/studyos');
    window.scrollTo(0, 0);
    setRoute('studyos');
  }, []);

  if (checkingSetup) {
    return <RouteFallback dark={route === 'studyos'} />;
  }

  if (route === 'studyos') {
    return (
      <Suspense fallback={<RouteFallback dark />}>
        <StudyOSApp />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <LandingPage onLaunchStudyOS={handleLaunchStudyOS} />
    </Suspense>
  );
}

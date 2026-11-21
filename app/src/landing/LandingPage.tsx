import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, HardDrive, Layers, WifiOff } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import './landing.css';
import { LandingNav } from './LandingNav';
import { FeatureChapters } from './FeatureChapters';
import { WorkflowShowcase } from './WorkflowShowcase';
import { BenefitsAndFaq } from './BenefitsAndFaq';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const Hero3DScene = lazy(() => import('./Hero3DScene'));

interface LandingPageProps {
  onLaunchStudyOS: () => void;
}

export default function LandingPage({ onLaunchStudyOS }: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollProgressRef = useRef(0);

  // Lazy-enable WebGL 3D strictly on viewports >= 768px with reduced-motion respected
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    // Ensure light theme metadata while on the light-first landing page
    document.documentElement.removeAttribute('data-theme');
    document.title = 'Study Schedule — Local-First Academic Command Center';

    const mqWide = window.matchMedia('(min-width: 768px)');
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update3D = () => setEnable3D(mqWide.matches && !mqReduced.matches);
    update3D();
    mqWide.addEventListener('change', update3D);
    mqReduced.addEventListener('change', update3D);

    // Smooth Lenis scrolling synchronized cleanly with GSAP ScrollTrigger
    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    if (!mqReduced.matches) {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      tickerFn = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    return () => {
      mqWide.removeEventListener('change', update3D);
      mqReduced.removeEventListener('change', update3D);
      if (tickerFn) gsap.ticker.remove(tickerFn);
      lenis?.destroy();
    };
  }, []);

  // GSAP Hero SplitText Reveal + Scroll Progress Tracker
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const reduceMotion = ctx.conditions?.reduceMotion ?? false;

          if (heroRef.current) {
            ScrollTrigger.create({
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              onUpdate: (self) => {
                scrollProgressRef.current = self.progress;
              },
            });
          }

          if (reduceMotion) return;

          SplitText.create('.lp-hero-title', {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 105,
                autoAlpha: 0,
                duration: 0.78,
                stagger: 0.08,
                ease: 'power3.out',
              });
            },
          });

          gsap.from('.lp-hero-fade', {
            y: 18,
            autoAlpha: 0,
            duration: 0.68,
            stagger: 0.09,
            delay: 0.18,
            ease: 'power3.out',
          });
        },
      );
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  };

  const handleHeroPointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  return (
    <div id="top" ref={rootRef} className="lp-root min-h-screen">
      {/* 1. MINIMAL STICKY NAVIGATION */}
      <LandingNav onLaunchStudyOS={onLaunchStudyOS} />

      <main>
        {/* 2. CINEMATIC LIGHT-FIRST HERO + FLOATING 3D PRODUCT STAGE */}
        <section
          ref={heroRef}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
          className="lp-hero-wash relative overflow-hidden pt-7 pb-10 sm:pt-9 sm:pb-14"
        >
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            {/* Editorial Centered Header */}
            <div className="mx-auto max-w-[820px] text-center">
              <div className="lp-hero-fade inline-flex items-center gap-2 text-xs font-medium text-[#5C5952]">
                <span className="h-2 w-2 rounded-full bg-[#15803D]" />
                <span>Open-source · local-first PWA · zero accounts</span>
              </div>

              <h1 className="lp-hero-title mt-3 font-serif text-[38px] sm:text-[52px] lg:text-[62px] font-normal leading-[1.02] tracking-[-0.035em] text-[#141413]">
                Your entire semester, in one calm place.
              </h1>

              <p className="lp-hero-fade mx-auto mt-3.5 max-w-[580px] text-base sm:text-[17px] leading-[1.52] text-[#5C5952]">
                Timetable, exam syllabus scope, Three.js 3D textbook reader, wall-clock Pomodoro,
                and 24-hour analytics — stored locally in one JSON file with optional GitHub Gist
                sync.
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="lp-hero-fade mt-5 flex flex-wrap items-center justify-center gap-3">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onLaunchStudyOS}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#141413] px-6 text-sm font-medium text-[#FBFBF9] shadow-sm transition-colors hover:bg-[#2A2825]"
                >
                  <span>Launch StudyOS</span>
                  <ArrowUpRight size={16} strokeWidth={1.75} />
                </motion.button>
                <a
                  href="#features"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E6E3DC] bg-white/90 px-5 text-sm font-medium text-[#141413] transition-colors hover:bg-[#F3F1EC]"
                >
                  <span>Explore features</span>
                  <ArrowDown size={15} strokeWidth={1.75} className="text-[#5C5952]" />
                </a>
              </div>
            </div>

            {/* Interactive React Three Fiber 3D Product Stage (with clean mobile fallback) */}
            <div className="relative mx-auto mt-4 sm:mt-5 max-w-[1180px]">
              {enable3D ? (
                <div className="relative h-[400px] sm:h-[440px] lg:h-[470px] w-full">
                  <Suspense
                    fallback={
                      <div className="mx-auto max-w-[920px] lp-device-frame-light overflow-hidden p-2">
                        <img
                          src="/landing/screen-dashboard.webp"
                          alt="Study Schedule Dashboard"
                          className="w-full rounded-[16px]"
                        />
                      </div>
                    }
                  >
                    <Hero3DScene
                      pointerRef={pointerRef}
                      scrollProgressRef={scrollProgressRef}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="mx-auto max-w-[920px] lp-device-frame-light overflow-hidden p-2">
                  <img
                    src="/landing/screen-dashboard.webp"
                    alt="Study Schedule Dashboard interface"
                    className="w-full rounded-[16px]"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. PRODUCT INTRODUCTION (WARM STONE #F3F1EC) */}
        <section id="product" className="border-t border-[#E6E3DC] bg-[#F3F1EC] py-24 sm:py-32">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-medium text-[#D97706]">The problem we solved</div>
              <h2 className="mt-3 font-serif text-[34px] sm:text-[48px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
                Stop juggling five fragmented apps just to study
              </h2>
              <p className="mt-4 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
                Students normally scatter lectures across a calendar, notes in a cloud wiki, timers
                in a phone app, and textbooks in separate folders. Study Schedule unifies your
                entire academic workflow in one local-first command center.
              </p>
            </div>

            {/* Framed Real Application Screenshot */}
            <div className="mx-auto mt-12 max-w-[1060px] lp-device-frame-light overflow-hidden p-2.5 sm:p-3">
              <img
                src="/landing/screen-dashboard.webp"
                alt="Live Study Schedule Dashboard displaying daily study allocation, XP progress, and 6-dimension consistency streaks"
                loading="lazy"
                className="w-full rounded-[16px]"
              />
            </div>

            {/* 3 Calm Architectural Value Pillars */}
            <div className="mx-auto mt-10 grid max-w-[1060px] gap-5 md:grid-cols-3">
              {[
                {
                  icon: HardDrive,
                  title: '100% local JSON ownership',
                  desc: 'Autosaves straight to a readable JSON file on your disk via the File System Access API.',
                },
                {
                  icon: WifiOff,
                  title: 'Works offline everywhere',
                  desc: 'Installed as a PWA with IndexedDB mirroring — study in libraries, flights, or lecture halls.',
                },
                {
                  icon: Layers,
                  title: '15 modules, one calm system',
                  desc: 'Timetable, Exams, Study timer, 3D Library, Tasks, Habits, Goals, and Analytics share one truth.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#E6E3DC] bg-white p-6"
                >
                  <Icon size={18} strokeWidth={1.6} className="text-[#D97706]" />
                  <h3 className="mt-3 text-[15px] font-medium text-[#141413]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5C5952]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. FEATURE STORYTELLING (4 ALTERNATING LIGHT & CINEMATIC DARK CHAPTERS) */}
        <FeatureChapters enable3D={enable3D} />

        {/* 5. INTERACTIVE REAL-WORKFLOW SHOWCASE & SYNC SIMULATOR */}
        <WorkflowShowcase />

        {/* 6–9. BENEFITS, COMPARISON, VERIFIED PROOF, FINAL CTA, FAQ & FOOTER */}
        <BenefitsAndFaq onLaunchStudyOS={onLaunchStudyOS} />
      </main>
    </div>
  );
}

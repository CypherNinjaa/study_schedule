import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, HardDrive, Layers, WifiOff } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import './landing.css';
import { LandingNav } from './LandingNav';
import { FeatureChapters } from './FeatureChapters';
import { WorkflowShowcase } from './WorkflowShowcase';
import { BenefitsAndFaq } from './BenefitsAndFaq';
import { useInViewport } from './useInViewport';

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText);

const Hero3DScene = lazy(() => import('./Hero3DScene'));

const SECTION_IDS = ['product', 'features', 'workflow', 'benefits', 'faq'] as const;

interface LandingPageProps {
  onLaunchStudyOS: () => void;
}

export default function LandingPage({ onLaunchStudyOS }: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const productRef = useRef<HTMLElement | null>(null);
  const smootherRef = useRef<ScrollSmoother | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollProgressRef = useRef(0);

  // Lazy-enable WebGL 3D strictly on viewports >= 768px with reduced-motion respected
  const [enable3D, setEnable3D] = useState(false);
  const [hero3DFallback, setHero3DFallback] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  // Pause Hero3DScene render loop automatically when scrolled out of view or tab is hidden
  const heroViewport = useInViewport(heroRef, '150px 0px');

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    document.title = 'Study Schedule — Free Student Study Planner, Timetable & Semester OS';

    const mqWide = window.matchMedia('(min-width: 768px)');
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update3D = () => setEnable3D(mqWide.matches && !mqReduced.matches);
    update3D();
    mqWide.addEventListener('change', update3D);
    mqReduced.addEventListener('change', update3D);

    // Track active section in navbar via lightweight IntersectionObserver
    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
              if (visible[0]?.target.id) {
                setActiveSection(visible[0].target.id);
              }
            },
            { rootMargin: '-25% 0px -55% 0px', threshold: [0.05, 0.25, 0.5] },
          )
        : null;

    if (observer) {
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }

    return () => {
      observer?.disconnect();
      mqWide.removeEventListener('change', update3D);
      mqReduced.removeEventListener('change', update3D);
    };
  }, []);

  const handleNavigateSection = useCallback((href: string) => {
    const targetId = href.replace(/^#/, '');
    if (targetId === 'top') {
      if (smootherRef.current) {
        smootherRef.current.scrollTo(0, true);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setActiveSection('');
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) return;
    if (smootherRef.current) {
      smootherRef.current.scrollTo(target, true, 'top 56px');
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Full-site GSAP ScrollSmoother + Bidirectional ScrollTrigger Choreography
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const reduceMotion = ctx.conditions?.reduceMotion ?? false;

          // Native GSAP ScrollSmoother: butter-smooth inertial scroll both UP & DOWN
          let smoother: ScrollSmoother | null = null;
          if (!reduceMotion) {
            smoother = ScrollSmoother.create({
              wrapper: '#smooth-wrapper',
              content: '#smooth-content',
              smooth: 1.15,
              smoothTouch: 0.1,
              effects: true,
            });
            smootherRef.current = smoother;
          }

          // Global hairline scroll progress bar (0 DOM layout thrashing via scaleX)
          ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
              if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
              }
              if (self.progress < 0.02) {
                setActiveSection('');
              }
            },
          });

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

          // Hero entrance SplitText line-mask reveal
          SplitText.create('.lp-hero-title', {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 105,
                autoAlpha: 0,
                duration: 0.82,
                stagger: 0.08,
                ease: 'power3.out',
              });
            },
          });

          gsap.from('.lp-hero-fade', {
            y: 18,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.08,
            delay: 0.16,
            ease: 'power3.out',
          });

          // Bidirectional scrubbed Hero parallax exit (reverses smoothly when scrolling back up)
          if (heroRef.current) {
            gsap.to('.lp-hero-header', {
              y: -44,
              opacity: 0.25,
              ease: 'none',
              scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.75,
              },
            });

            gsap.to('.lp-hero-stage', {
              y: -22,
              scale: 0.96,
              ease: 'none',
              scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.75,
              },
            });
          }

          // Section 3 Product Introduction: bidirectional scrubbed hardware rise + pillars
          if (productRef.current) {
            gsap.from('.lp-intro-copy', {
              y: 28,
              autoAlpha: 0,
              duration: 0.75,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: productRef.current,
                start: 'top 84%',
                toggleActions: 'play none none reverse',
              },
            });

            gsap.fromTo(
              '.lp-intro-frame',
              { y: 54, scale: 0.92, autoAlpha: 0.5 },
              {
                y: -18,
                scale: 1,
                autoAlpha: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '.lp-intro-frame',
                  start: 'top 95%',
                  end: 'bottom 25%',
                  scrub: 0.85,
                },
              },
            );

            gsap.from('.lp-intro-pillar', {
              y: 26,
              autoAlpha: 0,
              duration: 0.65,
              stagger: 0.1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.lp-intro-pillars',
                start: 'top 88%',
                toggleActions: 'play none none reverse',
              },
            });
          }

          // Ensure all child & parent ScrollTriggers sort top-to-bottom and refresh after fonts load
          ScrollTrigger.sort();
          ScrollTrigger.refresh();
          document.fonts?.ready.then(() => {
            ScrollTrigger.refresh();
          });

          return () => {
            smoother?.kill();
            smootherRef.current = null;
          };
        },
      );
      return () => {
        mm.revert();
        smootherRef.current = null;
      };
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

  const showHero3D = enable3D && !hero3DFallback;

  return (
    <div id="top" ref={rootRef} className="lp-root min-h-screen">
      {/* Accessible Skip Link (fixed outside ScrollSmoother wrapper) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-[#141413] focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-[#FBFBF9]"
      >
        Skip to content
      </a>

      {/* 1. FIXED STICKY NAVIGATION (outside #smooth-wrapper per ScrollSmoother best practices) */}
      <LandingNav
        onLaunchStudyOS={onLaunchStudyOS}
        activeSection={activeSection}
        progressBarRef={progressBarRef}
        onNavigateSection={handleNavigateSection}
      />

      {/* Official GSAP ScrollSmoother DOM Wrapper */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main-content" className="pt-14">
            {/* 2. CINEMATIC LIGHT-FIRST HERO + FLOATING 3D PRODUCT STAGE */}
            <section
              ref={heroRef}
              onPointerMove={handleHeroPointerMove}
              onPointerLeave={handleHeroPointerLeave}
              className="lp-hero-wash relative overflow-hidden pt-7 pb-10 sm:pt-9 sm:pb-14"
            >
              <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
                {/* Editorial Centered Header */}
                <div className="lp-hero-header mx-auto max-w-[820px] text-center">
                  <div className="lp-hero-fade inline-flex items-center gap-2 text-xs font-medium text-[#5C5952]">
                    <span className="h-2 w-2 rounded-full bg-[#15803D]" />
                    <span>Open-source · local-first PWA · zero accounts</span>
                  </div>

                  <h1 className="lp-hero-title mt-3 font-serif text-[38px] sm:text-[52px] lg:text-[62px] font-normal leading-[1.02] tracking-[-0.035em] text-[#141413]">
                    Your entire semester, in one calm place.
                  </h1>

                  <p className="lp-hero-fade mx-auto mt-3.5 max-w-[600px] text-base sm:text-[17px] leading-[1.52] text-[#5C5952]">
                    A free student productivity and study planning platform to organize your
                    semester, weekly class timetable, exam syllabus scope, 3D PDF/EPUB textbooks,
                    and 24-hour focus sessions — stored locally in one JSON file.
                  </p>

                  {/* Primary + Secondary CTAs */}
                  <div className="lp-hero-fade mt-5 flex flex-wrap items-center justify-center gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onLaunchStudyOS}
                      className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#141413] px-6 text-sm font-medium text-[#FBFBF9] shadow-sm transition-colors hover:bg-[#2A2825]"
                    >
                      <span>Launch StudyOS</span>
                      <ArrowUpRight
                        size={16}
                        strokeWidth={1.75}
                        className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </motion.button>
                    <a
                      href="#features"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigateSection('#features');
                      }}
                      className="group inline-flex h-11 items-center gap-2 rounded-full border border-[#E6E3DC] bg-white/90 px-5 text-sm font-medium text-[#141413] transition-colors hover:border-[#C8C3B8] hover:bg-[#F3F1EC]"
                    >
                      <span>Explore features</span>
                      <ArrowDown
                        size={15}
                        strokeWidth={1.75}
                        className="text-[#5C5952] transition-transform duration-200 group-hover:translate-y-0.5"
                      />
                    </a>
                  </div>
                </div>

                {/* Interactive React Three Fiber 3D Product Stage (with clean mobile & WebGL fallback) */}
                <div className="lp-hero-stage relative mx-auto mt-4 sm:mt-5 max-w-[1180px]">
                  {showHero3D ? (
                    <div
                      role="img"
                      aria-label="Interactive 3D preview of the Study Schedule dashboard with floating Pomodoro timer, Monday timetable, and local JSON storage cards"
                      className="relative h-[400px] sm:h-[440px] lg:h-[470px] w-full"
                    >
                      <Suspense
                        fallback={
                          <div className="mx-auto max-w-[920px] lp-device-frame-light overflow-hidden p-2">
                            <img
                              src="/landing/screen-dashboard.webp"
                              alt="Study Schedule student planner dashboard displaying daily study allocation, XP progress, and consistency streaks"
                              width={1440}
                              height={900}
                              fetchPriority="high"
                              className="w-full h-auto rounded-[16px]"
                            />
                          </div>
                        }
                      >
                        <Hero3DScene
                          pointerRef={pointerRef}
                          scrollProgressRef={scrollProgressRef}
                          active={heroViewport.inView}
                          onFallback={() => setHero3DFallback(true)}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-[920px] lp-device-frame-light overflow-hidden p-2">
                      <img
                        src="/landing/screen-dashboard.webp"
                        alt="Study Schedule student planner dashboard interface"
                        width={1440}
                        height={900}
                        fetchPriority="high"
                        className="w-full h-auto rounded-[16px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. PRODUCT INTRODUCTION (WARM STONE #F3F1EC) */}
            <section
              id="product"
              ref={productRef}
              className="scroll-mt-14 border-t border-[#E6E3DC] bg-[#F3F1EC] py-24 sm:py-32"
            >
              <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
                <div className="lp-intro-copy mx-auto max-w-2xl text-center">
                  <div className="text-xs font-medium text-[#B45309]">The problem we solved</div>
                  <h2 className="mt-3 font-serif text-[34px] sm:text-[48px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
                    Stop juggling five fragmented apps just to study
                  </h2>
                  <p className="mt-4 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
                    Students normally scatter lectures across a calendar, notes in a cloud wiki,
                    timers in a phone app, and textbooks in separate folders. Study Schedule
                    unifies your entire academic workflow in one local-first command center.
                  </p>
                </div>

                {/* Framed Real Application Screenshot */}
                <div className="lp-intro-frame lp-parallax-frame mx-auto mt-12 max-w-[1060px] lp-device-frame-light overflow-hidden p-2.5 sm:p-3">
                  <img
                    src="/landing/screen-dashboard.webp"
                    alt="Live Study Schedule Dashboard displaying daily study allocation, XP progress, and 6-dimension consistency streaks"
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-[16px]"
                  />
                </div>

                {/* 3 Calm Architectural Value Pillars */}
                <div className="lp-intro-pillars mx-auto mt-10 grid max-w-[1060px] gap-5 md:grid-cols-3">
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
                      className="lp-intro-pillar lp-card-hover rounded-2xl border border-[#E6E3DC] bg-white p-6"
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
            <FeatureChapters enable3D={enable3D} onLaunchStudyOS={onLaunchStudyOS} />

            {/* 5. INTERACTIVE REAL-WORKFLOW SHOWCASE & SYNC SIMULATOR */}
            <WorkflowShowcase onLaunchStudyOS={onLaunchStudyOS} />

            {/* 6–9. BENEFITS, COMPARISON, VERIFIED PROOF, FINAL CTA, FAQ & FOOTER */}
            <BenefitsAndFaq onLaunchStudyOS={onLaunchStudyOS} />
          </main>
        </div>
      </div>
    </div>
  );
}

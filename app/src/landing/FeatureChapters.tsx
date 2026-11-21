import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  ZoomIn,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ReaderThemeId } from './Flipbook3DScene';
import { useInViewport } from './useInViewport';

const Flipbook3DScene = lazy(() => import('./Flipbook3DScene'));

interface FeatureChaptersProps {
  enable3D: boolean;
  onLaunchStudyOS: () => void;
}

interface CloseupLens {
  id: string;
  label: string;
  image: string;
  alt: string;
  caption: string;
  scale: number;
  origin: string;
}

const TODAY_LENSES: CloseupLens[] = [
  {
    id: 'full',
    label: 'Full Today view',
    image: '/landing/screen-today.webp',
    alt: 'Study Schedule Today view showing timeline, 0 to 100 daily score breakdown, and daily habits',
    caption: 'Agenda timeline, daily score breakdown & habit toggles in one screen',
    scale: 1,
    origin: '50% 50%',
  },
  {
    id: 'score',
    label: '0–100 score formula',
    image: '/landing/screen-today.webp',
    alt: 'Close-up of the Study Schedule 0 to 100 daily productivity breakdown card',
    caption: 'Transparent weighted formula: Study (30), Tasks (25), Habits (15), Coding (10), Sleep (10)',
    scale: 1.92,
    origin: '94% 46%',
  },
  {
    id: 'habits',
    label: 'Daily habits',
    image: '/landing/screen-today.webp',
    alt: 'Close-up of Study Schedule daily habit pills including sleep, coding, and non-syllabus reading',
    caption: 'One-tap daily habits feed directly into both your score and 6-dimension streaks',
    scale: 1.96,
    origin: '95% 96%',
  },
];

const ACADEMIC_LENSES: CloseupLens[] = [
  {
    id: 'timetable',
    label: 'Weekly timetable',
    image: '/landing/screen-timetable.webp',
    alt: 'Study Schedule Weekly College Timetable showing Semester V classes, labs, rooms, and instructors',
    caption: 'Semester V · 27 recurring weekly lectures & labs across 20h 15m',
    scale: 1,
    origin: '50% 50%',
  },
  {
    id: 'slots',
    label: 'Lecture & lab slots',
    image: '/landing/screen-timetable.webp',
    alt: 'Close-up of recurring Monday and Tuesday lecture and lab blocks with room numbers and instructors',
    caption: 'Color-coded class cards track exact room numbers, lab badges, and instructors',
    scale: 1.72,
    origin: '44% 76%',
  },
  {
    id: 'exams',
    label: 'Exam readiness',
    image: '/landing/screen-exams.webp',
    alt: 'Study Schedule Exams dashboard tracking upcoming exams, countdowns, and syllabus preparedness',
    caption: 'Dedicated Exams view links each paper to scoped syllabus modules & readiness percentage',
    scale: 1,
    origin: '50% 50%',
  },
];

const STUDY_LENSES: CloseupLens[] = [
  {
    id: 'full',
    label: 'Full workspace',
    image: '/landing/screen-study.webp',
    alt: 'Study Schedule Study page featuring the Snake Pomodoro timer, PiP toggle, and subject time breakdown',
    caption: 'Focus timer, Picture-in-Picture controls, and 7D/30D/90D subject ledger',
    scale: 1,
    origin: '50% 50%',
  },
  {
    id: 'pip',
    label: 'Snake Pomodoro & PiP',
    image: '/landing/screen-study.webp',
    alt: 'Close-up of the Study Schedule Snake Pomodoro timer with PiP, Presets, Fullscreen, and -5m/+5m controls',
    caption: 'Pop into floating Picture-in-Picture or adjust session length live with -5m / +5m',
    scale: 1.78,
    origin: '35% 74%',
  },
  {
    id: 'subjects',
    label: 'Subject time ledger',
    image: '/landing/screen-study.webp',
    alt: 'Close-up of Study Schedule per-subject time breakdown showing STAT311 and CSIT379 session totals',
    caption: 'Every focus session automatically credits the linked subject and topic count',
    scale: 1.82,
    origin: '94% 84%',
  },
];

const SPREAD_LABELS = [
  'Ch. 1 · Time Series',
  'Ch. 2 · Syllabus Scope',
  'Ch. 3 · Active Notes',
  'Ch. 4 · Session Log',
];

function ProductCloseupFrame({
  lenses,
  dark = false,
}: {
  lenses: CloseupLens[];
  dark?: boolean;
}) {
  const [activeId, setActiveId] = useState(lenses[0].id);
  const current = lenses.find((l) => l.id === activeId) ?? lenses[0];

  return (
    <div className="space-y-3">
      <div
        className={`${
          dark ? 'lp-device-frame-dark' : 'lp-device-frame-light'
        } overflow-hidden p-2 sm:p-2.5`}
      >
        <div className="relative overflow-hidden rounded-[16px] bg-[#131416] aspect-[16/9]">
          <img
            src={current.image}
            alt={current.alt}
            width={1440}
            height={900}
            loading="lazy"
            decoding="async"
            className="lp-closeup-img h-full w-full object-cover"
            style={{
              transform: `scale(${current.scale})`,
              transformOrigin: current.origin,
            }}
          />
          {current.scale > 1 && (
            <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#0C0D0F]/80 px-2.5 py-1 font-mono text-[11px] text-[#F4F2EC] backdrop-blur-md">
              <ZoomIn size={12} className="text-[#E58B4A]" />
              Detail view
            </span>
          )}
        </div>
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-2.5 pt-3 pb-1 text-xs ${
            dark ? 'text-[#9A968D]' : 'text-[#5C5952]'
          }`}
        >
          <span>{current.caption}</span>
        </div>
      </div>

      {/* Restrained Apple-style segmented detail controls */}
      <div
        role="group"
        aria-label="Inspect product detail"
        className="flex flex-wrap items-center gap-1.5"
      >
        {lenses.map((lens) => {
          const isActive = lens.id === activeId;
          return (
            <button
              key={lens.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveId(lens.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                dark
                  ? isActive
                    ? 'border-[#E58B4A]/60 bg-[#E58B4A]/15 text-[#F4F2EC]'
                    : 'border-white/10 bg-[#15171A] text-[#9A968D] hover:border-white/25 hover:text-[#F4F2EC]'
                  : isActive
                    ? 'border-[#141413] bg-[#141413] text-[#FBFBF9]'
                    : 'border-[#E6E3DC] bg-white text-[#5C5952] hover:border-[#C8C3B8] hover:text-[#141413]'
              }`}
            >
              {lens.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Section 4: Four alternating Light & Cinematic Dark Apple-style feature chapters.
 * Combines real product UI close-up inspection with an interactive R3F 3D Flipbook
 * chapter and a working Snake Pomodoro duration demonstration.
 */
export function FeatureChapters({ enable3D, onLaunchStudyOS }: FeatureChaptersProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flipbookChapterRef = useRef<HTMLElement | null>(null);
  const chapterProgressRef = useRef(0);
  const bookPointerRef = useRef({ x: 0, y: 0 });

  // Lazy-mount & pause 3D Flipbook WebGL loop strictly around viewport visibility
  const flipbookViewport = useInViewport(flipbookChapterRef, '350px 0px');
  const [flipbookFallback, setFlipbookFallback] = useState(false);
  const [bookViewMode, setBookViewMode] = useState<'3d' | 'library'>('3d');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [readerTheme, setReaderTheme] = useState<ReaderThemeId>('paper');

  // Interactive mini Snake Pomodoro preview state (with accurate -5m/+5m & Save early math)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setSavedNotice(`Completed · logged ${Math.round(totalSeconds / 60)} min`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, totalSeconds]);

  const adjustMinutes = (delta: number) => {
    setSavedNotice(null);
    setSecondsLeft((prev) => {
      const next = Math.max(60, prev + delta * 60);
      const diff = next - prev;
      setTotalSeconds((t) => Math.max(60, t + diff));
      return next;
    });
  };

  const handleSaveEarly = () => {
    const elapsedSec = totalSeconds - secondsLeft;
    const loggedMin = Math.max(1, Math.round(elapsedSec / 60));
    setRunning(false);
    setSavedNotice(
      elapsedSec > 0
        ? `Saved early · logged exact ${loggedMin} min`
        : `Ready · will log ${Math.round(totalSeconds / 60)} min on finish`,
    );
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const reduceMotion = ctx.conditions?.reduceMotion ?? false;

          // Scrubbed progress tracker for the 3D Flipbook chapter
          if (flipbookChapterRef.current) {
            ScrollTrigger.create({
              trigger: flipbookChapterRef.current,
              start: 'top bottom',
              end: 'bottom top',
              onUpdate: (self) => {
                chapterProgressRef.current = self.progress;
              },
            });
          }

          if (reduceMotion) return;

          // Bidirectional scrubbed depth parallax on every chapter visual frame (up & down)
          gsap.utils.toArray<HTMLElement>('.lp-chapter-reveal').forEach((el) => {
            gsap.fromTo(
              el,
              { y: 52, scale: 0.945, autoAlpha: 0.45 },
              {
                y: -26,
                scale: 1,
                autoAlpha: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: el,
                  start: 'top 96%',
                  end: 'bottom 18%',
                  scrub: 0.85,
                },
              },
            );
          });

          // Bidirectional editorial copy entrance + subtle opposing scroll float
          gsap.utils.toArray<HTMLElement>('.lp-copy-reveal').forEach((el) => {
            gsap.from(el, {
              y: 28,
              autoAlpha: 0,
              duration: 0.72,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 86%',
                toggleActions: 'play none none reverse',
              },
            });
          });

          // 24-hour segmented bar horizontal reveal (reverses cleanly when scrolling back up)
          const segments = gsap.utils.toArray<HTMLElement>('.lp-24h-seg');
          if (segments.length) {
            gsap.from(segments, {
              scaleX: 0,
              transformOrigin: 'left center',
              duration: 0.68,
              stagger: 0.08,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: segments[0],
                start: 'top 88%',
                toggleActions: 'play none none reverse',
              },
            });
          }
        },
      );

      return () => mm.revert();
    },
    { scope: wrapperRef },
  );

  const mmStr = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ssStr = String(secondsLeft % 60).padStart(2, '0');
  // Smooth continuous countdown ratio (1.0 when full -> drains smoothly as time runs)
  const remainingFraction = Math.max(0.02, secondsLeft / Math.max(1, totalSeconds));
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - remainingFraction);
  const headAngle = -Math.PI / 2 + Math.PI * 2 * remainingFraction;
  const headX = 70 + r * Math.cos(headAngle);
  const headY = 70 + r * Math.sin(headAngle);

  const show3DBook = enable3D && !flipbookFallback && bookViewMode === '3d';

  return (
    <div id="features" ref={wrapperRef} className="scroll-mt-14">
      {/* =================================================================
          CHAPTER 4A (LIGHT #FBFBF9): Today & 24-Hour Time Accounting
          ================================================================= */}
      <section className="bg-[#FBFBF9] py-24 sm:py-32 border-t border-[#E6E3DC]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="lp-copy-reveal max-w-lg">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#D97706]">
                <Clock size={14} strokeWidth={1.75} />
                <span>24-hour time accounting</span>
              </div>
              <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
                Account for every hour, not just tasks
              </h2>
              <p className="mt-5 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
                Inspired by calm daily planning, Today pairs your timeline, tasks, habits, and a
                composite 0–100 daily productivity breakdown. See exactly how study, coding,
                classes, sleep, exercise, and distractions balance across all 24 hours.
              </p>

              {/* Compact 24h Segmented Ledger Preview */}
              <div className="lp-card-hover mt-8 rounded-2xl border border-[#E6E3DC] bg-white p-5">
                <div className="flex items-center justify-between text-xs text-[#5C5952]">
                  <span className="font-medium text-[#141413]">Sample 24-hour day split</span>
                  <span className="font-mono lp-tabular text-[#B45309]">1,440 min total</span>
                </div>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[#F3F1EC]">
                  <div className="lp-24h-seg bg-[#6D4CA0]" style={{ width: '31%' }} title="Sleep" />
                  <div className="lp-24h-seg bg-[#B45309]" style={{ width: '19%' }} title="College" />
                  <div className="lp-24h-seg bg-[#D97706]" style={{ width: '16%' }} title="Study" />
                  <div className="lp-24h-seg bg-[#0D9488]" style={{ width: '11%' }} title="Coding" />
                  <div className="lp-24h-seg bg-[#15803D]" style={{ width: '5%' }} title="Exercise" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[#6B665D]">Study</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">3h 50m</div>
                  </div>
                  <div>
                    <div className="text-[#6B665D]">Coding</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">2h 35m</div>
                  </div>
                  <div>
                    <div className="text-[#6B665D]">Sleep</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">7h 30m</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-chapter-reveal">
              <ProductCloseupFrame lenses={TODAY_LENSES} />
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 4B (CINEMATIC DARK #0C0D0F + INTERACTIVE 3D TEXTBOOK)
          ================================================================= */}
      <section
        ref={flipbookChapterRef}
        className="lp-dark-surface relative overflow-hidden bg-[#0C0D0F] py-28 sm:py-36 text-[#F4F2EC]"
      >
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Interactive React Three Fiber 3D Textbook + Live Library Toggle */}
            <div className="lp-chapter-reveal relative order-2 lg:order-1 space-y-3">
              <div
                role="region"
                aria-label="Interactive 3D textbook flipbook preview"
                tabIndex={show3DBook ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!show3DBook) return;
                  if (e.key === 'ArrowRight') {
                    setSpreadIndex((s) => Math.min(3, s + 1));
                  } else if (e.key === 'ArrowLeft') {
                    setSpreadIndex((s) => Math.max(0, s - 1));
                  }
                }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  bookPointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                  bookPointerRef.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                }}
                onPointerLeave={() => {
                  bookPointerRef.current.x = 0;
                  bookPointerRef.current.y = 0;
                }}
                className="lp-device-frame-dark relative overflow-hidden"
              >
                {show3DBook ? (
                  <div className="relative h-[380px] sm:h-[460px] w-full">
                    {flipbookViewport.hasEntered ? (
                      <Suspense
                        fallback={
                          <div className="flex h-full items-center justify-center text-xs text-[#9A968D]">
                            Loading 3D textbook…
                          </div>
                        }
                      >
                        <Flipbook3DScene
                          chapterProgressRef={chapterProgressRef}
                          spreadIndex={spreadIndex}
                          theme={readerTheme}
                          pointerRef={bookPointerRef}
                          active={flipbookViewport.inView}
                          onTurnNext={() => setSpreadIndex((s) => (s + 1) % 4)}
                          onFallback={() => setFlipbookFallback(true)}
                        />
                      </Suspense>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#9A968D]">
                        Preparing 3D reader…
                      </div>
                    )}

                    {/* Top subtle hint badge */}
                    <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-center justify-between text-[11px]">
                      <span className="rounded-full border border-white/10 bg-[#0C0D0F]/75 px-3 py-1 font-mono text-[#E58B4A] backdrop-blur-md">
                        {SPREAD_LABELS[spreadIndex]}
                      </span>
                      <span className="hidden sm:inline-block rounded-full border border-white/10 bg-[#0C0D0F]/75 px-3 py-1 text-[#9A968D] backdrop-blur-md">
                        Click book or arrows to turn pages
                      </span>
                    </div>

                    {/* Interactive Bottom Control Bar */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0C0D0F]/85 px-3 py-2 backdrop-blur-md text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Previous spread"
                          disabled={spreadIndex === 0}
                          onClick={() => setSpreadIndex((s) => Math.max(0, s - 1))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-[#15171A] text-[#F4F2EC] transition-colors hover:border-white/30 disabled:opacity-35"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="px-1.5 font-mono text-[11px] lp-tabular text-[#F4F2EC]">
                          {spreadIndex + 1} / 4
                        </span>
                        <button
                          type="button"
                          aria-label="Next spread"
                          disabled={spreadIndex === 3}
                          onClick={() => setSpreadIndex((s) => Math.min(3, s + 1))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-[#15171A] text-[#F4F2EC] transition-colors hover:border-white/30 disabled:opacity-35"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Real Reader Theme Switcher */}
                      <div role="group" aria-label="Reader lighting theme" className="flex items-center gap-1">
                        {(
                          [
                            { id: 'paper', label: 'Paper', dot: '#f8f4ec' },
                            { id: 'sepia', label: 'Sepia', dot: '#e5cca0' },
                            { id: 'night', label: 'Night', dot: '#282c34' },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={readerTheme === t.id}
                            onClick={() => setReaderTheme(t.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              readerTheme === t.id
                                ? 'bg-white/15 text-[#F4F2EC]'
                                : 'text-[#9A968D] hover:text-[#F4F2EC]'
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-white/25"
                              style={{ backgroundColor: t.dot }}
                            />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 sm:p-2.5">
                    <div className="overflow-hidden rounded-[16px] bg-[#131416] aspect-[16/9]">
                      <img
                        src="/landing/screen-library.webp"
                        alt="Study Schedule 3D Library & Reader showing imported local PDF and EPUB books"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between px-2.5 pt-3 pb-1 text-xs text-[#9A968D]">
                      <span>Live Library view · Dexie.js local binary vault</span>
                      <span className="font-mono text-[#E58B4A]">PDF · EPUB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* View switcher: Interactive 3D Book vs Live Library UI */}
              {enable3D && !flipbookFallback && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={bookViewMode === '3d'}
                    onClick={() => setBookViewMode('3d')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      bookViewMode === '3d'
                        ? 'border-[#E58B4A]/60 bg-[#E58B4A]/15 text-[#F4F2EC]'
                        : 'border-white/10 bg-[#15171A] text-[#9A968D] hover:border-white/25 hover:text-[#F4F2EC]'
                    }`}
                  >
                    Interactive 3D book
                  </button>
                  <button
                    type="button"
                    aria-pressed={bookViewMode === 'library'}
                    onClick={() => setBookViewMode('library')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      bookViewMode === 'library'
                        ? 'border-[#E58B4A]/60 bg-[#E58B4A]/15 text-[#F4F2EC]'
                        : 'border-white/10 bg-[#15171A] text-[#9A968D] hover:border-white/25 hover:text-[#F4F2EC]'
                    }`}
                  >
                    Live Library screen
                  </button>
                </div>
              )}
            </div>

            {/* Right: Editorial Storytelling */}
            <div className="lp-copy-reveal order-1 lg:order-2 max-w-lg lg:ml-auto">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#E58B4A]">
                <BookOpen size={14} strokeWidth={1.75} />
                <span>3D Bookshelf &amp; Dual Reader</span>
              </div>
              <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal leading-[1.08] tracking-[-0.025em] text-[#F4F2EC]">
                Read textbooks in 3D, stored right on your device
              </h2>
              <p className="mt-5 text-base sm:text-[17px] leading-[1.6] text-[#9A968D]">
                Import PDFs, EPUBs, and course handouts directly into your browser&apos;s IndexedDB
                library via Dexie.js. Flip pages with realistic Three.js physics, switch Paper,
                Sepia, or Night reading modes, and never upload textbooks to a third-party cloud.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Dual PDF.js + ePub.js',
                    desc: 'Chapter TOC navigation, reading themes, and automatic progress resume.',
                  },
                  {
                    title: '100% local binary vault',
                    desc: 'Textbooks stay inside your machine — zero upload limits or latency.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#15171A] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="text-sm font-medium text-[#F4F2EC]">{item.title}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9A968D]">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onLaunchStudyOS}
                className="group mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[#E58B4A] transition-colors hover:text-[#F4B17D]"
              >
                <span>Open your local 3D library in StudyOS</span>
                <ArrowUpRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 4C (WARM STONE #F3F1EC): Timetable & Exam Syllabus Scope
          ================================================================= */}
      <section className="bg-[#F3F1EC] py-24 sm:py-32">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="lp-copy-reveal max-w-lg">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#B45309]">
                <CalendarDays size={14} strokeWidth={1.75} />
                <span>Academic command center</span>
              </div>
              <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
                Your entire semester timetable and exam syllabus, scoped cleanly
              </h2>
              <p className="mt-5 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
                Build recurring weekly lecture schedules with room numbers and instructors. When
                midterms or finals approach, link an exam to a subject and select only the exact
                modules being tested — no clutter, clear urgency countdowns.
              </p>

              <ul className="mt-7 space-y-3 text-sm text-[#141413]">
                {[
                  'Recurring Monday–Sunday class slots with lab & lecture tags',
                  'Selective exam module/topic picker with readiness percentages',
                  'Subject credit weights, difficulty tracking, and linked materials',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#141413] text-[#FBFBF9]">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span className="text-[#5C5952]">{point}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={onLaunchStudyOS}
                className="group mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[#141413] transition-colors hover:text-[#B45309]"
              >
                <span>Build your semester timetable</span>
                <ArrowUpRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>
            </div>

            <div className="lp-chapter-reveal">
              <ProductCloseupFrame lenses={ACADEMIC_LENSES} />
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 4D (CINEMATIC DARK #0C0D0F): Snake Pomodoro, PiP & Fair XP
          ================================================================= */}
      <section className="lp-dark-surface bg-[#0C0D0F] py-28 sm:py-36 text-[#F4F2EC]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="lp-copy-reveal mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#E58B4A]">
              <Sparkles size={14} strokeWidth={1.75} />
              <span>Deep focus &amp; anti-farming XP</span>
            </div>
            <h2 className="mt-4 font-serif text-[34px] sm:text-[50px] font-normal leading-[1.06] tracking-[-0.025em] text-[#F4F2EC]">
              Focus that follows you across windows — and logs honest minutes
            </h2>
            <p className="mt-5 text-base sm:text-[17px] leading-[1.6] text-[#9A968D]">
              Pop the Snake Pomodoro into Picture-in-Picture while coding or reading. Adjust
              duration live, hit Save &amp; Stop if interrupted, and earn XP on a bidirectional
              ledger that revokes points if you undo a task.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
            {/* Left: Real Study & Snake Pomodoro Screenshot with Detail Close-Up Switcher */}
            <div className="lp-chapter-reveal">
              <ProductCloseupFrame lenses={STUDY_LENSES} dark />
            </div>

            {/* Right: Live Interactive Mini Snake Pomodoro Trial */}
            <div className="lp-chapter-reveal flex flex-col justify-between rounded-[24px] border border-white/10 bg-[#15171A] p-6 sm:p-7">
              <div>
                <div className="flex items-center justify-between text-xs text-[#9A968D]">
                  <span>Try the duration engine</span>
                  <span className="font-mono text-[#4ABE78]">Live demo</span>
                </div>

                <div className="my-6 flex justify-center">
                  <svg
                    width="140"
                    height="140"
                    viewBox="0 0 140 140"
                    role="img"
                    aria-label={`Interactive focus timer showing ${mmStr}:${ssStr}`}
                    className="overflow-visible"
                  >
                    <circle
                      cx="70"
                      cy="70"
                      r={r}
                      fill="none"
                      stroke="#2A2D34"
                      strokeWidth="7"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r={r}
                      fill="none"
                      stroke="#E58B4A"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 70 70)"
                      className="transition-[stroke-dashoffset] duration-300"
                    />
                    <circle cx={headX} cy={headY} r="5" fill="#E58B4A" />
                    <text
                      x="70"
                      y="69"
                      textAnchor="middle"
                      className="fill-[#F4F2EC] font-mono text-2xl font-medium lp-tabular"
                    >
                      {mmStr}:{ssStr}
                    </text>
                    <text
                      x="70"
                      y="88"
                      textAnchor="middle"
                      className="fill-[#9A968D] text-[11px]"
                    >
                      {running ? 'Focusing' : 'Ready'}
                    </text>
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => adjustMinutes(-5)}
                    className="rounded-full border border-white/15 bg-[#1C1E22] px-3 py-1.5 font-mono text-xs text-[#F4F2EC] transition-colors hover:border-white/30"
                  >
                    −5m
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setSavedNotice(null);
                      setRunning((v) => !v);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#E58B4A] px-4 py-1.5 text-xs font-medium text-[#131416] transition-all hover:brightness-110"
                  >
                    {running ? <Pause size={13} /> : <Play size={13} />}
                    {running ? 'Pause' : 'Start'}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => adjustMinutes(5)}
                    className="rounded-full border border-white/15 bg-[#1C1E22] px-3 py-1.5 font-mono text-xs text-[#F4F2EC] transition-colors hover:border-white/30"
                  >
                    +5m
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSaveEarly}
                    className="inline-flex items-center gap-1 rounded-full border border-[#4ABE78]/35 bg-[#4ABE78]/10 px-3 py-1.5 text-xs font-medium text-[#4ABE78] transition-colors hover:bg-[#4ABE78]/20"
                  >
                    <Square size={10} fill="currentColor" />
                    Save &amp; Stop
                  </motion.button>
                  <button
                    type="button"
                    aria-label="Reset demo timer"
                    onClick={() => {
                      setRunning(false);
                      setSavedNotice(null);
                      setSecondsLeft(25 * 60);
                      setTotalSeconds(25 * 60);
                    }}
                    className="rounded-full border border-white/10 p-1.5 text-[#9A968D] transition-colors hover:text-[#F4F2EC]"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {savedNotice && (
                  <p
                    role="status"
                    className="mt-3 text-center font-mono text-[11px] text-[#4ABE78]"
                  >
                    {savedNotice}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9A968D]">Session duration to log</span>
                  <span className="font-mono lp-tabular text-[#F4F2EC]">
                    {Math.round(totalSeconds / 60)} min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9A968D] inline-flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[#4ABE78]" />
                    Anti-farming XP ledger
                  </span>
                  <span className="font-mono text-[#4ABE78]">Bidirectional</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9A968D] inline-flex items-center gap-1.5">
                    <HardDrive size={13} className="text-[#E58B4A]" />
                    6 streak dimensions + freeze
                  </span>
                  <span className="font-mono text-[#9A968D]">35 badges</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

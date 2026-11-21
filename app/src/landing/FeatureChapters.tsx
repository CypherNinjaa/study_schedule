import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Flipbook3DScene = lazy(() => import('./Flipbook3DScene'));

interface FeatureChaptersProps {
  enable3D: boolean;
}

/**
 * Section 4: Four alternating Light & Cinematic Dark Apple-style feature chapters.
 * Combines real captured Study Schedule screenshots with a live R3F 3D Flipbook
 * chapter and a working interactive Snake Pomodoro demonstration.
 */
export function FeatureChapters({ enable3D }: FeatureChaptersProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flipbookChapterRef = useRef<HTMLElement | null>(null);
  const chapterProgressRef = useRef(0);

  // Interactive mini Snake Pomodoro preview state (with accurate -5m/+5m duration math)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const adjustMinutes = (delta: number) => {
    setSecondsLeft((prev) => {
      const next = Math.max(60, prev + delta * 60);
      const diff = next - prev;
      setTotalSeconds((t) => Math.max(60, t + diff));
      return next;
    });
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

          // Subtle Apple-style scroll entrance per chapter visual frame
          gsap.utils.toArray<HTMLElement>('.lp-chapter-reveal').forEach((el) => {
            gsap.from(el, {
              y: 36,
              autoAlpha: 0,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 82%',
                once: true,
              },
            });
          });
        },
      );

      return () => mm.revert();
    },
    { scope: wrapperRef },
  );

  const mmStr = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ssStr = String(secondsLeft % 60).padStart(2, '0');
  const pomoProgress = Math.max(
    0.06,
    (totalSeconds - secondsLeft) / Math.max(1, totalSeconds) || 0.72,
  );
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pomoProgress);
  const headAngle = -Math.PI / 2 + Math.PI * 2 * pomoProgress;
  const headX = 70 + r * Math.cos(headAngle);
  const headY = 70 + r * Math.sin(headAngle);

  return (
    <div id="features" ref={wrapperRef}>
      {/* =================================================================
          CHAPTER 4A (LIGHT #FBFBF9): Today & 24-Hour Time Accounting
          ================================================================= */}
      <section className="bg-[#FBFBF9] py-24 sm:py-32 border-t border-[#E6E3DC]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="max-w-lg">
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
              <div className="mt-8 rounded-2xl border border-[#E6E3DC] bg-white p-5">
                <div className="flex items-center justify-between text-xs text-[#5C5952]">
                  <span className="font-medium text-[#141413]">Sample 24-hour day split</span>
                  <span className="font-mono lp-tabular text-[#D97706]">1,440 min total</span>
                </div>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[#F3F1EC]">
                  <div className="bg-[#6D4CA0]" style={{ width: '31%' }} title="Sleep" />
                  <div className="bg-[#B45309]" style={{ width: '19%' }} title="College" />
                  <div className="bg-[#D97706]" style={{ width: '16%' }} title="Study" />
                  <div className="bg-[#0D9488]" style={{ width: '11%' }} title="Coding" />
                  <div className="bg-[#15803D]" style={{ width: '5%' }} title="Exercise" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[#8A857B]">Study</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">3h 50m</div>
                  </div>
                  <div>
                    <div className="text-[#8A857B]">Coding</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">2h 35m</div>
                  </div>
                  <div>
                    <div className="text-[#8A857B]">Sleep</div>
                    <div className="mt-0.5 font-mono font-medium lp-tabular text-[#141413]">7h 30m</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-chapter-reveal">
              <div className="lp-device-frame-light overflow-hidden p-2">
                <img
                  src="/landing/screen-today.webp"
                  alt="Study Schedule Today view showing daily timeline, score breakdown, and daily habits"
                  loading="lazy"
                  className="w-full rounded-[16px] border border-[#2D2F35]/10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 4B (CINEMATIC DARK #0C0D0F + R3F 3D): 3D Flipbook & Library
          ================================================================= */}
      <section
        ref={flipbookChapterRef}
        className="relative overflow-hidden bg-[#0C0D0F] py-28 sm:py-36 text-[#F4F2EC]"
      >
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Interactive React Three Fiber 3D Textbook */}
            <div className="lp-chapter-reveal relative order-2 lg:order-1">
              <div className="lp-device-frame-dark relative h-[380px] sm:h-[460px] w-full overflow-hidden">
                {enable3D ? (
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center text-xs text-[#9A968D]">
                        Loading 3D textbook…
                      </div>
                    }
                  >
                    <Flipbook3DScene chapterProgressRef={chapterProgressRef} />
                  </Suspense>
                ) : (
                  <img
                    src="/landing/screen-library.webp"
                    alt="Study Schedule 3D Library & Reader"
                    loading="lazy"
                    className="h-full w-full object-cover object-left-top"
                  />
                )}
                <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#0C0D0F]/80 px-3.5 py-2 backdrop-blur-md text-xs">
                  <span className="text-[#F4F2EC]">Three.js 3D Flipbook Engine</span>
                  <span className="font-mono text-[#E58B4A]">PDF · EPUB · Dexie.js</span>
                </div>
              </div>
            </div>

            {/* Right: Editorial Storytelling */}
            <div className="order-1 lg:order-2 max-w-lg lg:ml-auto">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#E58B4A]">
                <BookOpen size={14} strokeWidth={1.75} />
                <span>3D Bookshelf & Dual Reader</span>
              </div>
              <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal leading-[1.08] tracking-[-0.025em] text-[#F4F2EC]">
                Read textbooks in 3D, stored right on your device
              </h2>
              <p className="mt-5 text-base sm:text-[17px] leading-[1.6] text-[#9A968D]">
                Import PDFs, EPUBs, and course handouts directly into your browser&apos;s IndexedDB
                library via Dexie.js. Flip pages with realistic Three.js physics, track reading
                hours automatically, and never upload copyrighted books to a third-party cloud.
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
                    className="rounded-2xl border border-white/10 bg-[#15171A] p-4"
                  >
                    <div className="text-sm font-medium text-[#F4F2EC]">{item.title}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9A968D]">{item.desc}</p>
                  </div>
                ))}
              </div>
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
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#D97706]">
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
            </div>

            <div className="lp-chapter-reveal">
              <div className="lp-device-frame-light overflow-hidden p-2">
                <img
                  src="/landing/screen-timetable.webp"
                  alt="Study Schedule Weekly College Timetable showing Semester V classes, labs, rooms, and instructors"
                  loading="lazy"
                  className="w-full rounded-[16px] border border-[#2D2F35]/10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 4D (CINEMATIC DARK #0C0D0F): Snake Pomodoro, PiP & Fair XP
          ================================================================= */}
      <section className="bg-[#0C0D0F] py-28 sm:py-36 text-[#F4F2EC]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#E58B4A]">
              <Sparkles size={14} strokeWidth={1.75} />
              <span>Deep focus & anti-farming XP</span>
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

          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-stretch">
            {/* Left: Real Study & Snake Pomodoro Screenshot */}
            <div className="lp-chapter-reveal lp-device-frame-dark overflow-hidden p-2 flex">
              <img
                src="/landing/screen-study.webp"
                alt="Study Schedule Study page featuring the Snake Pomodoro timer, Picture-in-Picture toggle, and subject time breakdown"
                loading="lazy"
                className="w-full rounded-[16px] object-cover"
              />
            </div>

            {/* Right: Live Interactive Mini Snake Pomodoro Trial */}
            <div className="lp-chapter-reveal flex flex-col justify-between rounded-[24px] border border-white/10 bg-[#15171A] p-6 sm:p-7">
              <div>
                <div className="flex items-center justify-between text-xs text-[#9A968D]">
                  <span>Try the duration engine</span>
                  <span className="font-mono text-[#4ABE78]">Live demo</span>
                </div>

                <div className="my-6 flex justify-center">
                  <svg width="140" height="140" viewBox="0 0 140 140" className="overflow-visible">
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
                    className="rounded-full border border-white/15 bg-[#1C1E22] px-3 py-1.5 font-mono text-xs text-[#F4F2EC] hover:border-white/30"
                  >
                    −5m
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setRunning((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#E58B4A] px-4 py-1.5 text-xs font-medium text-[#131416] hover:brightness-110"
                  >
                    {running ? <Pause size={13} /> : <Play size={13} />}
                    {running ? 'Pause' : 'Start'}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => adjustMinutes(5)}
                    className="rounded-full border border-white/15 bg-[#1C1E22] px-3 py-1.5 font-mono text-xs text-[#F4F2EC] hover:border-white/30"
                  >
                    +5m
                  </motion.button>
                  <button
                    type="button"
                    aria-label="Reset demo timer"
                    onClick={() => {
                      setRunning(false);
                      setSecondsLeft(25 * 60);
                      setTotalSeconds(25 * 60);
                    }}
                    className="rounded-full border border-white/10 p-1.5 text-[#9A968D] hover:text-[#F4F2EC]"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9A968D]">Exact logged duration</span>
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

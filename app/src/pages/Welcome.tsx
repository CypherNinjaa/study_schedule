import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileJson,
  FolderOpen,
  GraduationCap,
  HardDrive,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { isFileSystemAccessSupported } from '@/services/fileStorage';
import { buildSeedSubjects } from '@/data/subjects';
import { buildSeedSemester } from '@/data/timetable';
import { cn } from '@/utils/misc';
import { formatMinutes } from '@/utils/date';

const STEPS = ['Welcome', 'Storage', 'You', 'Routine', 'Targets', 'Subjects', 'Timetable', 'Habits'] as const;

export function Welcome() {
  const data = useDataStore((s) => s.data);
  const mutate = useDataStore((s) => s.mutate);
  const storageMode = useDataStore((s) => s.storageMode);
  const connectNewFile = useDataStore((s) => s.connectNewFile);
  const openExistingFile = useDataStore((s) => s.openExistingFile);
  const useLocalOnly = useDataStore((s) => s.useLocalOnly);
  const saveNow = useDataStore((s) => s.saveNow);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(data?.profile.name ?? '');
  const [wake, setWake] = useState(data?.settings.wakeTime ?? '05:00');
  const [sleep, setSleep] = useState(data?.settings.sleepTime ?? '00:00');
  const [study, setStudy] = useState(data?.settings.targets.study ?? 180);
  const [coding, setCoding] = useState(data?.settings.targets.coding ?? 90);
  const [exercise, setExercise] = useState(data?.settings.targets.exercise ?? 30);
  const [seedSubjects, setSeedSubjects] = useState(true);
  const [seedTimetable, setSeedTimetable] = useState(true);
  // Defaults already contain the seeded habits; onboarding just narrows them.
  const seededHabits = data?.habits ?? [];
  const [pickedHabits, setPickedHabits] = useState<string[]>(seededHabits.map((h) => h.id));

  if (!data) return null;

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    mutate(
      (d) => {
        d.profile.name = name.trim() || 'Vikash';
        d.profile.onboarded = true;
        d.settings.wakeTime = wake;
        d.settings.sleepTime = sleep;
        d.settings.targets.study = study;
        d.settings.targets.coding = coding;
        d.settings.targets.exercise = exercise;

        // The defaults ship pre-seeded, so opting out means clearing them —
        // and opting back in restores them rather than duplicating.
        if (seedSubjects) {
          if (d.subjects.length === 0) d.subjects = buildSeedSubjects();
        } else {
          d.subjects = [];
        }

        if (seedTimetable) {
          if (!d.schedule.semesters.some((s) => s.slots.length > 0)) {
            const semester = buildSeedSemester();
            d.schedule.semesters = [semester];
            d.schedule.activeSemesterId = semester.id;
          }
        } else {
          for (const sem of d.schedule.semesters) sem.slots = [];
        }

        d.habits = d.habits.filter((h) => pickedHabits.includes(h.id));
      },
      { silent: true },
    );
    await saveNow();
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-4">
      <div className="card w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-line px-5 py-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < step ? 'bg-accent' : i === step ? 'bg-accent/60' : 'bg-line',
              )}
              title={s}
            />
          ))}
        </div>

        <div className="px-6 py-7">
          {step === 0 && (
            <Step
              icon={<Sparkles size={22} />}
              title="Your productivity OS"
              blurb="A private study and productivity workspace that runs entirely on your computer. Nothing is uploaded anywhere — no accounts, no servers, no tracking."
            >
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {[
                  'Plan your day around your real class timetable',
                  'Track study, coding, habits and sleep',
                  'Earn XP, levels and streaks for real progress',
                  'See where your 24 hours actually go',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-ok" />
                    {t}
                  </li>
                ))}
              </ul>
            </Step>
          )}

          {step === 1 && (
            <Step
              icon={<HardDrive size={22} />}
              title="Where should your data live?"
              blurb="Your data is saved as a plain JSON file on your own computer. You can back it up, move it, or read it in any text editor."
            >
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  className="btn-outline w-full justify-start gap-3 py-3"
                  onClick={() => void connectNewFile()}
                  disabled={!isFileSystemAccessSupported()}
                >
                  <FileJson size={18} className="text-accent" />
                  <span className="text-left">
                    <span className="block text-sm font-medium text-ink">Create a data file</span>
                    <span className="block text-xs text-muted">e.g. Documents/Study Productivity/productivity-data.json</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-outline w-full justify-start gap-3 py-3"
                  onClick={() => void openExistingFile()}
                  disabled={!isFileSystemAccessSupported()}
                >
                  <FolderOpen size={18} className="text-accent" />
                  <span className="text-left">
                    <span className="block text-sm font-medium text-ink">Open an existing data file</span>
                    <span className="block text-xs text-muted">Continue from a previous setup or another device</span>
                  </span>
                </button>
                <button type="button" className="btn-ghost w-full justify-start gap-3 py-3" onClick={() => void useLocalOnly()}>
                  <HardDrive size={18} />
                  <span className="text-left">
                    <span className="block text-sm font-medium text-ink">Just use this browser for now</span>
                    <span className="block text-xs text-muted">You can connect a file later from Settings</span>
                  </span>
                </button>
              </div>
              {!isFileSystemAccessSupported() && (
                <p className="mt-3 rounded-ctl bg-warn/10 px-3 py-2 text-xs text-warn">
                  This browser can't write files directly. Chrome or Edge support it. Your data will be kept safely in
                  this browser meanwhile, and you can export a backup any time.
                </p>
              )}
              {storageMode && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ok">
                  <Check size={14} /> {storageMode === 'file' ? 'File connected.' : 'Using in-browser storage.'}
                </p>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step icon={<User size={22} />} title="What should I call you?" blurb="Used for greetings only. It never leaves your device.">
              <input
                className="input mt-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vikash"
                autoFocus
              />
            </Step>
          )}

          {step === 3 && (
            <Step
              icon={<Clock size={22} />}
              title="Your daily rhythm"
              blurb="Defaults you can change any time. These are your own targets, not medical advice."
            >
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Wake up</span>
                  <input type="time" className="input" value={wake} onChange={(e) => setWake(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Sleep</span>
                  <input type="time" className="input" value={sleep} onChange={(e) => setSleep(e.target.value)} />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                Sleeping at {sleep} and waking at {wake} gives you about {formatMinutes(sleepSpan(sleep, wake))} of
                sleep.
              </p>
            </Step>
          )}

          {step === 4 && (
            <Step icon={<Target size={22} />} title="Daily targets" blurb="What a good day looks like for you. Adjust these whenever your semester load changes.">
              <div className="mt-4 space-y-4">
                <Slider label="Study" value={study} onChange={setStudy} min={30} max={480} step={15} />
                <Slider label="Coding" value={coding} onChange={setCoding} min={0} max={360} step={15} />
                <Slider label="Exercise" value={exercise} onChange={setExercise} min={0} max={120} step={5} />
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step
              icon={<GraduationCap size={22} />}
              title="Your subjects"
              blurb="I can pre-fill this semester's subjects with their syllabus modules. Everything stays editable."
            >
              <Toggle
                checked={seedSubjects}
                onChange={setSeedSubjects}
                title="Load BCA-V subjects"
                subtitle="Statistics, Java, Python, Quantitative Aptitude, Campus to Corporate, Communicative French"
              />
            </Step>
          )}

          {step === 6 && (
            <Step
              icon={<GraduationCap size={22} />}
              title="Your class timetable"
              blurb="Your Monday–Friday BCA-V (A) schedule at Amity, Room 201. Every class can be edited, moved or removed later."
            >
              <Toggle
                checked={seedTimetable}
                onChange={setSeedTimetable}
                title="Load my timetable"
                subtitle="Includes teachers, rooms and lab sessions"
              />
            </Step>
          )}

          {step === 7 && (
            <Step icon={<Check size={22} />} title="Pick your starting habits" blurb="Keep it small. You can add more later — five is plenty to begin with.">
              <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {seededHabits.map((h) => {
                  const on = pickedHabits.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setPickedHabits((p) => (on ? p.filter((n) => n !== h.id) : [...p, h.id]))}
                      className={cn(
                        'flex items-center gap-2 rounded-ctl border px-3 py-2 text-left text-sm transition-colors',
                        on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:bg-elevated',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          on ? 'border-accent bg-accent text-white' : 'border-line',
                        )}
                      >
                        {on && <Check size={11} />}
                      </span>
                      <span className="truncate">{h.name}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-elevated/50 px-5 py-3">
          <button type="button" className="btn-ghost btn-sm gap-1.5" onClick={back} disabled={step === 0}>
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-xs text-muted">
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary btn-sm gap-1.5" onClick={next}>
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => void finish()}>
              Start <Check size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  blurb,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</span>
      <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{blurb}</p>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="tabular text-sm text-muted">{formatMinutes(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'mt-4 flex w-full items-start gap-3 rounded-ctl border px-4 py-3 text-left transition-colors',
        checked ? 'border-accent bg-accent-soft' : 'border-line hover:bg-elevated',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
          checked ? 'border-accent bg-accent text-white' : 'border-line',
        )}
      >
        {checked && <Check size={13} />}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs leading-relaxed text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

/** Minutes between a sleep time and a wake time, crossing midnight. */
function sleepSpan(sleepAt: string, wakeAt: string): number {
  const [sh, sm] = sleepAt.split(':').map(Number);
  const [wh, wm] = wakeAt.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = wh * 60 + wm;
  return end > start ? end - start : 1440 - start + end;
}

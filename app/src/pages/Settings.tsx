import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileJson,
  FolderOpen,
  Monitor,
  Moon,
  RefreshCw,
  Save,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Targets, ThemeMode } from '@/types';
import { updateProfile, updateSettings } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useUiStore } from '@/store/useUiStore';
import { useData } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader } from '@/components/ui/Primitives';
import { confirmAction } from '@/utils/confirm';
import { formatMinutes } from '@/utils/date';
import { cn } from '@/utils/misc';

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function Settings() {
  const data = useData();
  const s = data.settings;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Settings" subtitle="Your data, your defaults — all of it editable" />
      <StorageCard />
      <ProfileCard />

      <Card>
        <CardHeader title="Appearance" subtitle="Theme and motion" />
        <div className="space-y-4 p-4">
          <div>
            <span className="label">Theme</span>
            <div className="flex flex-wrap gap-1.5">
              {THEMES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={s.theme === t.value}
                    onClick={() => updateSettings({ theme: t.value })}
                    className={cn(
                      'flex items-center gap-1.5 rounded-ctl border px-3 py-2 text-sm transition-colors',
                      s.theme === t.value
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line text-muted hover:bg-elevated',
                    )}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Toggle
            checked={s.reduceMotion}
            onChange={(v) => updateSettings({ reduceMotion: v })}
            title="Reduce motion"
            hint="Turns off the celebration and transition animations."
          />
          <label className="block max-w-xs">
            <span className="label">Week starts on</span>
            <select
              className="input"
              value={s.weekStartsOn}
              onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Your day" subtitle="Defaults only — change them whenever your routine changes" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Wake time</span>
            <input
              type="time"
              className="input"
              value={s.wakeTime}
              onChange={(e) => updateSettings({ wakeTime: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Sleep time</span>
            <input
              type="time"
              className="input"
              value={s.sleepTime}
              onChange={(e) => updateSettings({ sleepTime: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Travel to college (min)</span>
            <input
              type="number"
              min={0}
              className="input tabular"
              value={s.travelMinutesToCollege}
              onChange={(e) => updateSettings({ travelMinutesToCollege: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="block">
            <span className="label">Travel back (min)</span>
            <input
              type="number"
              min={0}
              className="input tabular"
              value={s.travelMinutesFromCollege}
              onChange={(e) => updateSettings({ travelMinutesFromCollege: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        </div>
      </Card>

      <TargetsCard />
      <PomodoroCard />
      <NotificationsCard />
      <DangerCard />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">
        <span className="text-ink">{title}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function StorageCard() {
  const storageMode = useDataStore((st) => st.storageMode);
  const fileName = useDataStore((st) => st.fileName);
  const saveState = useDataStore((st) => st.saveState);
  const lastSavedAt = useDataStore((st) => st.lastSavedAt);
  const saveError = useDataStore((st) => st.saveError);
  const saveNow = useDataStore((st) => st.saveNow);
  const saveAsFile = useDataStore((st) => st.saveAs);
  const connectNewFile = useDataStore((st) => st.connectNewFile);
  const openExistingFile = useDataStore((st) => st.openExistingFile);
  const reconnectFile = useDataStore((st) => st.reconnectFile);
  const importData = useDataStore((st) => st.importData);
  const exportBackup = useDataStore((st) => st.exportBackup);

  return (
    <Card>
      <CardHeader
        title="Your data file"
        subtitle="Everything stays on this device. Nothing is uploaded anywhere."
      />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FileJson size={16} className="text-muted" />
          {storageMode === 'file' ? (
            <span className="text-ink">{fileName}</span>
          ) : (
            <span className="text-ink">Browser storage only</span>
          )}
          <span
            className={cn(
              'chip',
              saveState === 'saved' && 'text-ok',
              saveState === 'saving' && 'text-accent',
              saveState === 'dirty' && 'text-warn',
              (saveState === 'disconnected' || saveState === 'error') && 'text-danger',
            )}
          >
            {saveState === 'saved'
              ? 'Saved'
              : saveState === 'saving'
                ? 'Saving…'
                : saveState === 'dirty'
                  ? 'Unsaved changes'
                  : saveState === 'disconnected'
                    ? 'File disconnected'
                    : saveState === 'error'
                      ? 'Save failed'
                      : 'Idle'}
          </span>
          {lastSavedAt && (
            <span className="text-[11px] text-muted">last saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
          )}
        </div>

        {storageMode !== 'file' && (
          <p className="rounded-ctl border border-line bg-elevated p-3 text-xs text-muted">
            Your data is being kept in this browser. Connect a file on your computer so you own a copy you can back up
            and move.
          </p>
        )}
        {saveError && <p className="text-xs text-danger">{saveError}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => void saveNow()}>
            <Save size={14} /> Save now
          </button>
          {saveState === 'disconnected' && (
            <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => void reconnectFile()}>
              <RefreshCw size={14} /> Reconnect file
            </button>
          )}
          <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => void saveAsFile()}>
            <FolderOpen size={14} /> Save as…
          </button>
          <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => void connectNewFile()}>
            <FileJson size={14} /> Create data file
          </button>
          <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => void openExistingFile()}>
            <FolderOpen size={14} /> Open existing file
          </button>
          <button type="button" className="btn-outline btn-sm gap-1.5" onClick={exportBackup}>
            <Download size={14} /> Export backup
          </button>
          <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => void importData()}>
            <Upload size={14} /> Import from file
          </button>
        </div>
      </div>
    </Card>
  );
}

function ProfileCard() {
  const data = useData();
  const p = data.profile;
  return (
    <Card>
      <CardHeader title="About you" subtitle="Used for headings and nothing else" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label">Name</span>
          <input className="input" value={p.name} onChange={(e) => updateProfile({ name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Course</span>
          <input className="input" value={p.course} onChange={(e) => updateProfile({ course: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Batch</span>
          <input className="input" value={p.batch} onChange={(e) => updateProfile({ batch: e.target.value })} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">College</span>
          <input className="input" value={p.college} onChange={(e) => updateProfile({ college: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Class teacher</span>
          <input
            className="input"
            value={p.classTeacher}
            onChange={(e) => updateProfile({ classTeacher: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="label">Default room</span>
          <input className="input" value={p.room} onChange={(e) => updateProfile({ room: e.target.value })} />
        </label>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const TARGET_FIELDS: { key: keyof Targets; label: string; hint: string }[] = [
  { key: 'study', label: 'Study', hint: 'Minutes a day' },
  { key: 'coding', label: 'Coding', hint: 'Minutes a day' },
  { key: 'exercise', label: 'Exercise', hint: 'Minutes a day' },
  { key: 'relationship', label: 'Time together', hint: 'Minutes a day, tracked privately' },
  { key: 'sleep', label: 'Sleep', hint: 'Minutes a night' },
  { key: 'socialMediaLimit', label: 'Social media limit', hint: 'A ceiling, not a target' },
];

function TargetsCard() {
  const data = useData();
  const t = data.settings.targets;
  return (
    <Card>
      <CardHeader title="Daily targets" subtitle="These drive your productivity score, so set them honestly" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {TARGET_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="label">{f.label}</span>
            <input
              type="number"
              min={0}
              step={5}
              className="input tabular"
              value={t[f.key]}
              onChange={(e) =>
                updateSettings({ targets: { ...t, [f.key]: Math.max(0, Number(e.target.value) || 0) } })
              }
            />
            <span className="mt-1 block text-[11px] text-muted">
              {f.hint} · {formatMinutes(t[f.key], { short: true })}
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function PomodoroCard() {
  const data = useData();
  const p = data.settings.pomodoro;
  const set = (patch: Partial<typeof p>) => updateSettings({ pomodoro: { ...p, ...patch } });
  return (
    <Card>
      <CardHeader title="Pomodoro" subtitle="Round lengths and what happens between them" />
      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Focus (min)</span>
            <input
              type="number"
              min={1}
              max={180}
              className="input tabular"
              value={p.focusMinutes}
              onChange={(e) => set({ focusMinutes: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label className="block">
            <span className="label">Break (min)</span>
            <input
              type="number"
              min={1}
              max={60}
              className="input tabular"
              value={p.breakMinutes}
              onChange={(e) => set({ breakMinutes: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label className="block">
            <span className="label">Long break (min)</span>
            <input
              type="number"
              min={1}
              max={120}
              className="input tabular"
              value={p.longBreakMinutes}
              onChange={(e) => set({ longBreakMinutes: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label className="block">
            <span className="label">Rounds before long break</span>
            <input
              type="number"
              min={1}
              max={12}
              className="input tabular"
              value={p.roundsBeforeLongBreak}
              onChange={(e) => set({ roundsBeforeLongBreak: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
        </div>
        <Toggle
          checked={p.autoStartNext}
          onChange={(v) => set({ autoStartNext: v })}
          title="Start the next round automatically"
        />
        <Toggle checked={p.soundEnabled} onChange={(v) => set({ soundEnabled: v })} title="Play a sound when a round ends" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function NotificationsCard() {
  const data = useData();
  const n = data.settings.notifications;
  const toast = useFeedbackStore((st) => st.toast);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setPermission(Notification.permission);
  }, []);

  const set = (patch: Partial<typeof n>) => updateSettings({ notifications: { ...n, ...patch } });

  const ask = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      set({ enabled: true });
      toast({ kind: 'success', title: 'Reminders on', message: 'They are created by this app on your device' });
    } else {
      toast({ kind: 'info', title: 'Reminders stay off', message: 'You can turn them on later from here' });
    }
  };

  return (
    <Card>
      <CardHeader title="Reminders" subtitle="Shown by your browser, on this device only" />
      <div className="space-y-4 p-4">
        {permission === 'unsupported' ? (
          <p className="text-xs text-muted">This browser does not support notifications.</p>
        ) : permission === 'granted' ? (
          <Toggle
            checked={n.enabled}
            onChange={(v) => set({ enabled: v })}
            title="Reminders enabled"
            hint="Nothing leaves your device — the reminders are scheduled locally."
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-outline btn-sm" onClick={() => void ask()}>
              Allow reminders
            </button>
            <span className="text-xs text-muted">
              {permission === 'denied'
                ? 'Your browser is blocking notifications for this site.'
                : 'Your browser will ask for permission once.'}
            </span>
          </div>
        )}

        <div className={cn('space-y-3', (!n.enabled || permission !== 'granted') && 'pointer-events-none opacity-50')}>
          <Toggle checked={n.upcomingClass} onChange={(v) => set({ upcomingClass: v })} title="Before a class starts" />
          <Toggle checked={n.upcomingTask} onChange={(v) => set({ upcomingTask: v })} title="Before a task is due" />
          <Toggle
            checked={n.streakReminder}
            onChange={(v) => set({ streakReminder: v })}
            title="If a streak is about to break"
          />
          <Toggle checked={n.goalReminder} onChange={(v) => set({ goalReminder: v })} title="When a goal deadline is near" />
          <label className="block max-w-xs">
            <span className="label">How early (minutes)</span>
            <input
              type="number"
              min={0}
              max={240}
              className="input tabular"
              value={n.leadMinutes}
              onChange={(e) => set({ leadMinutes: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DangerCard() {
  const data = useData();
  const s = data.settings;
  const resetAllData = useDataStore((st) => st.resetAllData);
  const exportBackup = useDataStore((st) => st.exportBackup);
  const navigate = useUiStore((st) => st.navigate);
  const toast = useFeedbackStore((st) => st.toast);
  const [confirmText, setConfirmText] = useState('');

  const counts = {
    tasks: data.tasks.length,
    sessions: data.studySessions.length,
    logs: data.dailyLogs.length,
    xp: data.xp.total,
  };

  return (
    <>
      <Card>
        <CardHeader title="Advanced" subtitle="Fine print you will rarely need to touch" />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Streak freezes per week</span>
            <input
              type="number"
              min={0}
              max={7}
              className="input tabular"
              value={s.streakFreezesPerWeek}
              onChange={(e) => updateSettings({ streakFreezesPerWeek: Math.max(0, Number(e.target.value) || 0) })}
            />
            <span className="mt-1 block text-[11px] text-muted">
              A freeze keeps a streak alive on a day you missed. Set it to 0 if you would rather the streak be strict.
            </span>
          </label>
          <label className="block">
            <span className="label">Autosave delay (ms)</span>
            <input
              type="number"
              min={200}
              max={10000}
              step={100}
              className="input tabular"
              value={s.autosaveDebounceMs}
              onChange={(e) => updateSettings({ autosaveDebounceMs: Math.min(10000, Math.max(200, Number(e.target.value) || 800)) })}
            />
            <span className="mt-1 block text-[11px] text-muted">
              How long the app waits after your last change before writing to the file.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Privacy" subtitle="What this app does and does not do" />
        <ul className="space-y-1.5 p-4 text-xs text-muted">
          <li>· Your productivity data is written only to the file you chose, on this computer.</li>
          <li>· No account, no server, no database. Nothing is uploaded.</li>
          <li>· No analytics and no tracking of any kind.</li>
          <li>· Data leaves this device only when you export or share the file yourself.</li>
        </ul>
      </Card>

      <Card className="border-danger/40">
        <CardHeader title="Danger zone" subtitle="Irreversible. Export a backup first." />
        <div className="space-y-3 p-4">
          <p className="flex items-start gap-2 text-xs text-muted">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
            <span>
              Resetting erases {counts.tasks} tasks, {counts.sessions} study sessions, {counts.logs} daily logs and{' '}
              {counts.xp.toLocaleString()} XP, and starts you over from the welcome screen. Your data file on disk is
              overwritten with a fresh, empty one.
            </span>
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="label">Type RESET to confirm</span>
              <input
                className="input w-40"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                aria-label="Type RESET to confirm"
              />
            </label>
            <button type="button" className="btn-outline btn-sm gap-1.5" onClick={exportBackup}>
              <Download size={14} /> Export backup first
            </button>
            <button
              type="button"
              className="btn-sm gap-1.5 rounded-ctl bg-danger px-3 py-2 text-sm text-white disabled:opacity-40"
              disabled={confirmText.trim().toUpperCase() !== 'RESET'}
              onClick={() =>
                confirmAction({
                  title: 'Erase everything?',
                  message:
                    'Every task, study session, habit completion, streak and XP point will be deleted, and your data file will be overwritten. There is no undo. If you have not exported a backup, cancel and do that first.',
                  confirmLabel: 'Erase everything',
                  danger: true,
                  onConfirm: async () => {
                    await resetAllData();
                    setConfirmText('');
                    toast({ kind: 'info', title: 'Everything was reset' });
                    navigate('dashboard');
                  },
                })
              }
            >
              <Trash2 size={14} /> Reset all data
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}





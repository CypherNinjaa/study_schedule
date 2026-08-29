/**
 * EyeComfortPanel — Dedicated eye health controls panel.
 *
 * Blue light filter, color temperature, brightness, focus mode,
 * paper texture, dyslexia font, 20-20-20 reminders.
 */
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  Sun,
  Moon,
  Timer,
  Shield,
} from 'lucide-react';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { READER_THEMES } from '@/types/bookshelf';
import { cn } from '@/utils/misc';

interface EyeComfortPanelProps {
  onClose: () => void;
}

export function EyeComfortPanel({ onClose }: EyeComfortPanelProps) {
  const settings = useBookshelfStore((s) => s.eyeComfort);
  const readerSettings = useBookshelfStore((s) => s.readerSettings);
  const setEyeComfort = useBookshelfStore((s) => s.setEyeComfort);
  const theme = READER_THEMES[readerSettings.theme];

  const [eyeCareTimer, setEyeCareTimer] = useState<number>(0);
  const [showReminder, setShowReminder] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  // 20-20-20 timer
  useEffect(() => {
    if (!settings.eyeCareReminders) return;

    timerRef.current = window.setInterval(() => {
      setEyeCareTimer((t) => {
        const next = t + 1;
        if (next >= settings.breakInterval) {
          setShowReminder(true);
          return 0;
        }
        return next;
      });
    }, 60000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings.eyeCareReminders, settings.breakInterval]);

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full rounded-xl border p-3 transition-all"
      style={{
        borderColor: checked ? `${theme.accent}40` : `${theme.text}10`,
        background: checked ? `${theme.accent}10` : 'transparent',
      }}
    >
      <div
        className={cn('relative h-5 w-9 rounded-full transition-colors')}
        style={{ background: checked ? theme.accent : `${theme.text}20` }}
      >
        <div
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </div>
      <span className="flex-1 text-left text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div
      className="absolute right-0 top-0 z-50 flex h-full w-80 flex-col overflow-y-auto border-l shadow-2xl"
      style={{
        background: `${theme.bg}f5`,
        borderColor: `${theme.text}10`,
        color: theme.text,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${theme.text}10` }}>
        <div className="flex items-center gap-2">
          <Eye size={16} style={{ color: theme.accent }} />
          <h3 className="text-sm font-semibold">Eye Comfort</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 opacity-50 hover:opacity-80 transition-opacity">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* Blue light filter */}
        <div className="space-y-3">
          <Toggle
            checked={settings.blueLight}
            onChange={(v) => setEyeComfort({ blueLight: v })}
            label="Blue Light Filter"
          />

          {settings.blueLight && (
            <div className="pl-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] opacity-40">Intensity</span>
                <span className="text-[11px] tabular opacity-50">{settings.blueLightIntensity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={settings.blueLightIntensity}
                onChange={(e) => setEyeComfort({ blueLightIntensity: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: '#f59e0b' }}
              />
              <div className="flex justify-between text-[9px] opacity-30 mt-0.5">
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>
          )}
        </div>

        {/* Color temperature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sun size={12} className="opacity-40" />
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40">Color Temperature</span>
            </div>
            <span className="text-[11px] tabular opacity-50">{settings.colorTemperature}K</span>
          </div>
          <input
            type="range"
            min={2700}
            max={6500}
            step={100}
            value={settings.colorTemperature}
            onChange={(e) => setEyeComfort({ colorTemperature: parseInt(e.target.value) })}
            className="w-full"
            style={{ accentColor: settings.colorTemperature < 4000 ? '#f59e0b' : '#60a5fa' }}
          />
          <div className="flex justify-between text-[9px] opacity-30 mt-0.5">
            <span>🕯️ Warm</span>
            <span>❄️ Cool</span>
          </div>
        </div>

        {/* Brightness reduction */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Moon size={12} className="opacity-40" />
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40">Brightness</span>
            </div>
            <span className="text-[11px] tabular opacity-50">
              {settings.brightnessReduction > 0 ? `-${settings.brightnessReduction}%` : 'Normal'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            value={settings.brightnessReduction}
            onChange={(e) => setEyeComfort({ brightnessReduction: parseInt(e.target.value) })}
            className="w-full"
            style={{ accentColor: theme.accent }}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <Toggle
            checked={settings.focusMode}
            onChange={(v) => setEyeComfort({ focusMode: v })}
            label="Focus Mode (dim edges)"
          />

          <Toggle
            checked={settings.paperTexture}
            onChange={(v) => setEyeComfort({ paperTexture: v })}
            label="Paper Texture"
          />

          <Toggle
            checked={settings.dyslexiaFont}
            onChange={(v) => setEyeComfort({ dyslexiaFont: v })}
            label="Dyslexia-Friendly Font"
          />

          <Toggle
            checked={settings.autoNightMode}
            onChange={(v) => setEyeComfort({ autoNightMode: v })}
            label="Auto Night Mode (after sunset)"
          />
        </div>

        {/* Eye care reminders */}
        <div className="space-y-2">
          <Toggle
            checked={settings.eyeCareReminders}
            onChange={(v) => setEyeComfort({ eyeCareReminders: v })}
            label="20-20-20 Eye Care Reminders"
          />

          {settings.eyeCareReminders && (
            <div className="rounded-xl p-3" style={{ background: `${theme.accent}08` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] opacity-40">Remind every</span>
                <span className="text-[11px] tabular opacity-50">{settings.breakInterval} min</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={settings.breakInterval}
                onChange={(e) => setEyeComfort({ breakInterval: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: theme.accent }}
              />
              <p className="mt-2 text-[10px] opacity-30">
                Every {settings.breakInterval} minutes, look at something 20 feet away for 20 seconds.
              </p>
              {eyeCareTimer > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Timer size={10} style={{ color: theme.accent }} />
                  <span className="text-[10px]" style={{ color: theme.accent }}>
                    Next reminder in {settings.breakInterval - eyeCareTimer}m
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Eye care tip */}
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: `${theme.text}08`, background: `${theme.text}03` }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Shield size={12} style={{ color: theme.accent }} />
            <span className="text-[11px] font-semibold" style={{ color: theme.accent }}>Eye Health Tips</span>
          </div>
          <ul className="space-y-1 text-[10px] opacity-40 leading-relaxed">
            <li>• Keep screen 20-26 inches from eyes</li>
            <li>• Position screen slightly below eye level</li>
            <li>• Blink frequently to prevent dry eyes</li>
            <li>• Take a 5-10 min break every hour</li>
            <li>• Use warm lighting in your room</li>
          </ul>
        </div>
      </div>

      {/* 20-20-20 reminder popup */}
      {showReminder && (
        <div
          className="absolute inset-0 z-[300] flex items-center justify-center"
          style={{ background: `${theme.bg}ee` }}
        >
          <div className="text-center p-8">
            <div className="text-4xl mb-4">👁️</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
              Time for an Eye Break!
            </h3>
            <p className="text-sm opacity-60 mb-6 max-w-xs">
              Look at something 20 feet away for 20 seconds. Your eyes will thank you!
            </p>
            <button
              type="button"
              onClick={() => setShowReminder(false)}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: theme.accent }}
            >
              Done, I'm ready
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ReaderSettingsPanel — Slide-out panel for reader customization.
 *
 * Font size, font family, line spacing, margins, width, theme picker.
 */
import { X } from 'lucide-react';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { READER_THEMES, type ReaderTheme } from '@/types/bookshelf';
import { cn } from '@/utils/misc';

interface ReaderSettingsPanelProps {
  onClose: () => void;
}

const FONT_OPTIONS = [
  { value: 'Georgia', label: 'Georgia', style: 'font-serif' },
  { value: 'Inter', label: 'Inter', style: 'font-sans' },
  { value: 'Merriweather', label: 'Merriweather', style: 'font-serif' },
  { value: 'Literata', label: 'Literata', style: 'font-serif' },
  { value: 'system-ui', label: 'System', style: 'font-sans' },
  { value: 'monospace', label: 'Monospace', style: 'font-mono' },
];

const PRESETS = [
  { name: 'Comfortable', fontSize: 18, lineSpacing: 1.7, fontFamily: 'Georgia', margins: 'medium' as const },
  { name: 'Compact', fontSize: 14, lineSpacing: 1.4, fontFamily: 'Inter', margins: 'narrow' as const },
  { name: 'Spacious', fontSize: 20, lineSpacing: 2.0, fontFamily: 'Merriweather', margins: 'wide' as const },
  { name: 'Night Study', fontSize: 16, lineSpacing: 1.6, fontFamily: 'system-ui', margins: 'medium' as const },
];

export function ReaderSettingsPanel({ onClose }: ReaderSettingsPanelProps) {
  const settings = useBookshelfStore((s) => s.readerSettings);
  const setSettings = useBookshelfStore((s) => s.setReaderSettings);
  const setTheme = useBookshelfStore((s) => s.setReaderTheme);
  const theme = READER_THEMES[settings.theme];

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
        <h3 className="text-sm font-semibold">Reader Settings</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 opacity-50 hover:opacity-80 transition-opacity">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Theme picker */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider opacity-40">Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(READER_THEMES) as [ReaderTheme, typeof theme][]).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all',
                  settings.theme === key
                    ? 'ring-2 ring-offset-1'
                    : 'opacity-60 hover:opacity-80',
                )}
                style={{
                  borderColor: settings.theme === key ? t.accent : `${theme.text}15`,
                  background: t.bg,
                }}
              >
                <div className="flex gap-0.5">
                  <div className="h-3 w-3 rounded-full" style={{ background: t.bg, border: `1px solid ${t.text}30` }} />
                  <div className="h-3 w-1 rounded-full" style={{ background: t.text }} />
                </div>
                <span className="text-[9px] font-medium" style={{ color: t.text }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-40">Font Size</label>
            <span className="text-xs tabular opacity-60">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettings({ fontSize: Math.max(12, settings.fontSize - 1) })}
              className="text-xs opacity-50 hover:opacity-80"
              style={{ fontSize: '12px' }}
            >
              A
            </button>
            <input
              type="range"
              min={12}
              max={32}
              value={settings.fontSize}
              onChange={(e) => setSettings({ fontSize: parseInt(e.target.value) })}
              className="flex-1 accent-current"
              style={{ accentColor: theme.accent }}
            />
            <button
              type="button"
              onClick={() => setSettings({ fontSize: Math.min(32, settings.fontSize + 1) })}
              className="opacity-50 hover:opacity-80"
              style={{ fontSize: '20px' }}
            >
              A
            </button>
          </div>
        </div>

        {/* Font family */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider opacity-40">Font Family</label>
          <div className="grid grid-cols-2 gap-1.5">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => setSettings({ fontFamily: font.value })}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs transition-all',
                  settings.fontFamily === font.value
                    ? 'border-current opacity-100'
                    : 'opacity-40 hover:opacity-60',
                )}
                style={{
                  borderColor: settings.fontFamily === font.value ? theme.accent : `${theme.text}15`,
                  fontFamily: font.value,
                }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line spacing */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-40">Line Spacing</label>
            <span className="text-xs tabular opacity-60">{settings.lineSpacing.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={1.2}
            max={2.5}
            step={0.1}
            value={settings.lineSpacing}
            onChange={(e) => setSettings({ lineSpacing: parseFloat(e.target.value) })}
            className="w-full"
            style={{ accentColor: theme.accent }}
          />
        </div>

        {/* Margins */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider opacity-40">Margins</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['narrow', 'medium', 'wide'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSettings({ margins: m })}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs capitalize transition-all',
                  settings.margins === m
                    ? 'border-current opacity-100'
                    : 'opacity-40 hover:opacity-60',
                )}
                style={{ borderColor: settings.margins === m ? theme.accent : `${theme.text}15` }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Reading width */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-40">Reading Width</label>
            <span className="text-xs tabular opacity-60">{settings.readingWidth}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={settings.readingWidth}
            onChange={(e) => setSettings({ readingWidth: parseInt(e.target.value) })}
            className="w-full"
            style={{ accentColor: theme.accent }}
          />
        </div>

        {/* Presets */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider opacity-40">Presets</label>
          <div className="space-y-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  setSettings({
                    fontSize: preset.fontSize,
                    lineSpacing: preset.lineSpacing,
                    fontFamily: preset.fontFamily,
                    margins: preset.margins,
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-left text-xs transition-all opacity-60 hover:opacity-80"
                style={{ borderColor: `${theme.text}10` }}
              >
                <span className="font-medium">{preset.name}</span>
                <span className="ml-2 opacity-40">
                  {preset.fontSize}px · {preset.fontFamily} · {preset.lineSpacing}×
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

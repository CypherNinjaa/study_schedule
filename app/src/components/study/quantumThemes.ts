export type QuantumThemeId = 'quantum' | 'nebula' | 'plasma' | 'cryo' | 'matrix' | 'minimal';

export interface QuantumTheme {
  id: QuantumThemeId;
  icon: string;
  name: string;
  look: string;
  unlockLevel: number;
  coreColor: string;
  secondaryColor: string;
  orbitColor: string;
  bgGradient: string;
  isLowPower?: boolean;
  isCrystalline?: boolean;
  isMatrixGlitch?: boolean;
  isNebulaCloud?: boolean;
  speedMultiplier: number;
}

export const QUANTUM_THEMES: QuantumTheme[] = [
  {
    id: 'quantum',
    icon: '⚛️',
    name: 'Quantum',
    look: 'Cyan/violet glow, classic Bohr orbits',
    unlockLevel: 1,
    coreColor: '#22d3ee',
    secondaryColor: '#a855f7',
    orbitColor: '#38bdf8',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.16) 0%, rgba(15, 23, 42, 0.94) 62%, #050811 100%)',
    speedMultiplier: 1.0,
  },
  {
    id: 'nebula',
    icon: '🌌',
    name: 'Nebula',
    look: 'Pink/orange gas cloud, slow drift',
    unlockLevel: 1,
    coreColor: '#f472b6',
    secondaryColor: '#fb923c',
    orbitColor: '#e879f9',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(244, 114, 182, 0.16) 0%, rgba(28, 12, 36, 0.94) 62%, #08040d 100%)',
    isNebulaCloud: true,
    speedMultiplier: 0.65,
  },
  {
    id: 'minimal',
    icon: '🌑',
    name: 'Minimal',
    look: 'Monochrome, very few particles (low-power mode)',
    unlockLevel: 1,
    coreColor: '#f8fafc',
    secondaryColor: '#94a3b8',
    orbitColor: '#cbd5e1',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.10) 0%, rgba(15, 17, 23, 0.96) 65%, #07080c 100%)',
    isLowPower: true,
    speedMultiplier: 0.75,
  },
  {
    id: 'plasma',
    icon: '🔥',
    name: 'Plasma',
    look: 'Hot orange core, fast and energetic electrons',
    unlockLevel: 2,
    coreColor: '#fbbf24',
    secondaryColor: '#f97316',
    orbitColor: '#ef4444',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.18) 0%, rgba(32, 12, 8, 0.94) 62%, #0b0402 100%)',
    speedMultiplier: 1.55,
  },
  {
    id: 'cryo',
    icon: '🧊',
    name: 'Cryo',
    look: 'Icy white/blue crystals, sharp edges',
    unlockLevel: 4,
    coreColor: '#f0f9ff',
    secondaryColor: '#38bdf8',
    orbitColor: '#7dd3fc',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.16) 0%, rgba(8, 22, 38, 0.94) 62%, #030b14 100%)',
    isCrystalline: true,
    speedMultiplier: 0.85,
  },
  {
    id: 'matrix',
    icon: '🟩',
    name: 'Matrix',
    look: 'Green mono particles, digital glitch on digit change',
    unlockLevel: 6,
    coreColor: '#4ade80',
    secondaryColor: '#16a34a',
    orbitColor: '#22c55e',
    bgGradient:
      'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15) 0%, rgba(5, 20, 10, 0.95) 62%, #020904 100%)',
    isMatrixGlitch: true,
    speedMultiplier: 1.15,
  },
];

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

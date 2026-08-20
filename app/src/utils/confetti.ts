import confetti from 'canvas-confetti';

function isMotionAllowed(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.reduceMotion !== 'true';
}

export function burstConfetti(intensity: 'small' | 'medium' | 'large' = 'medium') {
  if (!isMotionAllowed()) return;
  const counts = { small: 35, medium: 80, large: 160 };
  try {
    confetti({
      particleCount: counts[intensity],
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b'],
      disableForReducedMotion: true,
    });
  } catch {
    // Non-essential visual effect
  }
}

export function sideCannons() {
  if (!isMotionAllowed()) return;
  try {
    confetti({
      angle: 60,
      spread: 55,
      particleCount: 50,
      origin: { x: 0, y: 0.7 },
      colors: ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4'],
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      if (!isMotionAllowed()) return;
      confetti({
        angle: 120,
        spread: 55,
        particleCount: 50,
        origin: { x: 1, y: 0.7 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4'],
        disableForReducedMotion: true,
      });
    }, 120);
  } catch {
    // Non-essential visual effect
  }
}

export function celebrationFireworks() {
  if (!isMotionAllowed()) return;
  try {
    const end = Date.now() + 1500;
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() > end || !isMotionAllowed()) {
        clearInterval(interval);
        return;
      }
      confetti({
        startVelocity: 25,
        spread: 360,
        ticks: 50,
        origin: {
          x: Math.random() * 0.6 + 0.2,
          y: Math.random() * 0.4 + 0.2,
        },
        colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#06b6d4'],
        disableForReducedMotion: true,
      });
    }, 250);
  } catch {
    // Non-essential visual effect
  }
}

export function burstCanvasConfetti(canvas: HTMLCanvasElement) {
  if (!isMotionAllowed()) return;
  try {
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: false });
    myConfetti({
      particleCount: 55,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      disableForReducedMotion: true,
    });
  } catch {
    // Non-essential visual effect
  }
}

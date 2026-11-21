import { Component, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type ReaderThemeId = 'paper' | 'sepia' | 'night';

interface Flipbook3DSceneProps {
  /** Scroll progress (0..1) across the 3D Flipbook dark chapter */
  chapterProgressRef: React.MutableRefObject<number>;
  /** Active open spread index (0..3) */
  spreadIndex: number;
  /** Real StudyOS reader color theme */
  theme: ReaderThemeId;
  /** Pointer coordinates (-1..1) inside stage for gentle inspection tilt */
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  /** Pauses WebGL frameloop automatically when scrolled out of view */
  active?: boolean;
  /** Clicking the 3D book flips smoothly to the next spread */
  onTurnNext?: () => void;
  /** Fallback if WebGL context fails */
  onFallback?: () => void;
}

const THEME_PALETTE: Record<
  ReaderThemeId,
  {
    pageBg: string;
    pageAlt: string;
    ink: string;
    muted: string;
    accent: string;
    highlight: string;
    rule: string;
    keyLight: string;
    lampColor: string;
  }
> = {
  paper: {
    pageBg: '#fbf8f1',
    pageAlt: '#f2ece0',
    ink: '#151412',
    muted: '#4d4840',
    accent: '#c2610c',
    highlight: 'rgba(217, 119, 6, 0.14)',
    rule: 'rgba(20, 20, 19, 0.14)',
    keyLight: '#fff8ec',
    lampColor: '#e58b4a',
  },
  sepia: {
    pageBg: '#f2e5c9',
    pageAlt: '#e6d5b2',
    ink: '#241a0e',
    muted: '#574631',
    accent: '#a64b0a',
    highlight: 'rgba(180, 83, 9, 0.17)',
    rule: 'rgba(45, 34, 21, 0.16)',
    keyLight: '#ffe9c6',
    lampColor: '#f59e0b',
  },
  night: {
    pageBg: '#1c1f26',
    pageAlt: '#161920',
    ink: '#f1eee7',
    muted: '#a9a59c',
    accent: '#ee9655',
    highlight: 'rgba(229, 139, 74, 0.22)',
    rule: 'rgba(255, 255, 255, 0.14)',
    keyLight: '#e2ebff',
    lampColor: '#e58b4a',
  },
};

const PAGE_SPREADS = [
  {
    chapter: 'CHAPTER 01 · TIME SERIES',
    heading: 'Trend & Seasonal Decomposition',
    lines: [
      'Decompose observed series Y(t) into',
      'long-run trend T(t), seasonal S(t),',
      'and stationary residual noise e(t).',
    ],
    callout: 'Exam topic · Unit 2 (65% ready)',
    backHeading: 'Decomposition Summary',
    backLines: [
      '• Additive vs. multiplicative models',
      '• Moving averages isolate smooth trend',
      '• Logged directly to STAT311 syllabus',
    ],
    diagram: 'wave' as const,
  },
  {
    chapter: 'CHAPTER 02 · SYLLABUS SCOPE',
    heading: 'Midterm Modules & Checkpoints',
    lines: [
      '• Autocorrelation & ACF / PACF plots',
      '• Moving average & AR(p) stability',
      '• Differencing non-stationary series',
    ],
    callout: 'Linked to STAT311 · 5/18 topics done',
    backHeading: 'Scope & Readiness Notes',
    backLines: [
      '• Select only tested chapters per exam',
      '• Track topic mastery from 0 to 100%',
      '• Auto-calculates days-left urgency',
    ],
    diagram: 'bars' as const,
  },
  {
    chapter: 'CHAPTER 03 · READING NOTES',
    heading: 'Active Recall & Highlights',
    lines: [
      'Bookmarks & chapter TOC sync locally',
      'in Dexie.js without uploading PDFs',
      'or copyrighted course packs online.',
    ],
    callout: 'Autosaved · resumes exact page & TOC',
    backHeading: 'Local Binary Vault',
    backLines: [
      '• Dual PDF.js & ePub.js reader engine',
      '• Zero upload limits or cloud paywalls',
      '• Paper, Sepia & Night viewing modes',
    ],
    diagram: 'grid' as const,
  },
  {
    chapter: 'CHAPTER 04 · READING LEDGER',
    heading: 'Automatic Session Logging',
    lines: [
      'Every reading block feeds straight into',
      'your 24-hour Today breakdown and',
      '6-dimension study consistency streak.',
    ],
    callout: 'PDF.js + ePub.js · 100% offline PWA',
    backHeading: 'Reading Analytics',
    backLines: [
      '• Tracks pages read & reading velocity',
      '• Credits subject study goals live',
      '• Merges cleanly via Secret Gist',
    ],
    diagram: 'wave' as const,
  },
];

function createArchedPagePair(
  width: number,
  height: number,
  arch: number,
): { front: THREE.BufferGeometry; back: THREE.BufferGeometry } {
  const front = new THREE.PlaneGeometry(width, height, 24, 2);
  front.rotateX(-Math.PI / 2);
  front.translate(width / 2, 0.0025, 0);
  const fPos = front.attributes.position;
  const fUv = front.attributes.uv;
  for (let i = 0; i < fPos.count; i++) {
    const px = fPos.getX(i);
    const pz = fPos.getZ(i);
    const t = px / width;
    fPos.setY(i, fPos.getY(i) + Math.sin(t * Math.PI) * arch);
    fUv.setXY(i, t, 1 - (pz + height / 2) / height);
  }
  front.computeVertexNormals();

  const back = new THREE.PlaneGeometry(width, height, 24, 2);
  back.rotateX(Math.PI / 2);
  back.translate(width / 2, -0.0025, 0);
  const bPos = back.attributes.position;
  const bUv = back.attributes.uv;
  for (let i = 0; i < bPos.count; i++) {
    const px = bPos.getX(i);
    const pz = bPos.getZ(i);
    const t = px / width;
    bPos.setY(i, bPos.getY(i) + Math.sin(t * Math.PI) * arch);
    bUv.setXY(i, 1 - t, 1 - (pz + height / 2) / height);
  }
  back.computeVertexNormals();

  return { front, back };
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function configureSharpTexture(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.max(4, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

/** High-DPI 1024x1024 inside-left Table of Contents page for Spread 1 */
function createInsideLeftTocTexture(theme: ReaderThemeId, anisotropy: number): THREE.CanvasTexture {
  const pal = THEME_PALETTE[theme];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = pal.pageAlt;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle right spine shadow
    const spineGrad = ctx.createLinearGradient(1024, 0, 900, 0);
    spineGrad.addColorStop(0, theme === 'night' ? 'rgba(0,0,0,0.42)' : 'rgba(20,18,14,0.14)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(900, 0, 124, 1024);

    ctx.fillStyle = pal.accent;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText('LOCAL LIBRARY · STAT311', 88, 118);

    ctx.fillStyle = pal.rule;
    ctx.fillRect(88, 148, 820, 3);

    ctx.fillStyle = pal.ink;
    ctx.font = '600 58px "Newsreader", Georgia, serif';
    ctx.fillText('Applied Time Series', 88, 246);
    ctx.fillText('& Forecasting', 88, 314);

    ctx.fillStyle = pal.muted;
    ctx.font = '500 30px "Instrument Sans", sans-serif';
    ctx.fillText('Table of Contents · Stored in Dexie.js', 88, 386);

    const chapters = [
      { num: '01', name: 'Trend & Seasonal Decomposition', pg: 'p. 14' },
      { num: '02', name: 'Midterm Modules & Checkpoints', pg: 'p. 26' },
      { num: '03', name: 'Active Recall & Highlights', pg: 'p. 38' },
      { num: '04', name: 'Automatic Session Logging', pg: 'p. 50' },
    ];

    chapters.forEach((ch, idx) => {
      const y = 492 + idx * 106;
      ctx.fillStyle = idx === 0 ? pal.highlight : 'transparent';
      if (idx === 0) ctx.fillRect(72, y - 48, 848, 76);

      ctx.fillStyle = pal.accent;
      ctx.font = '700 28px "JetBrains Mono", monospace';
      ctx.fillText(ch.num, 92, y);

      ctx.fillStyle = pal.ink;
      ctx.font = idx === 0 ? '600 30px "Instrument Sans", sans-serif' : '500 30px "Instrument Sans", sans-serif';
      ctx.fillText(ch.name, 160, y);

      ctx.fillStyle = pal.muted;
      ctx.font = '500 26px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(ch.pg, 896, y);
      ctx.textAlign = 'left';

      ctx.fillStyle = pal.rule;
      ctx.fillRect(88, y + 36, 820, 2);
    });
  }

  return configureSharpTexture(canvas, anisotropy);
}

/** High-DPI 1024x1024 crisp textbook page texture with anisotropic mipmaps */
function createPageTexture(
  spread: (typeof PAGE_SPREADS)[number],
  pageNumber: number,
  theme: ReaderThemeId,
  side: 'front' | 'back',
  anisotropy: number,
): THREE.CanvasTexture {
  const pal = THEME_PALETTE[theme];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = side === 'front' ? pal.pageBg : pal.pageAlt;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle spine gutter gradient
    const spineGrad =
      side === 'front'
        ? ctx.createLinearGradient(0, 0, 110, 0)
        : ctx.createLinearGradient(1024, 0, 914, 0);
    spineGrad.addColorStop(0, theme === 'night' ? 'rgba(0,0,0,0.44)' : 'rgba(20,18,14,0.14)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(side === 'front' ? 0 : 914, 0, 110, 1024);

    // Header eyebrow & page number
    ctx.fillStyle = pal.accent;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText(side === 'front' ? spread.chapter : 'KEY NOTES · STUDYOS', 88, 114);

    ctx.fillStyle = pal.muted;
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`p. ${14 + pageNumber * 12 + (side === 'back' ? 1 : 0)}`, 936, 114);
    ctx.textAlign = 'left';

    // Crisp hairline divider
    ctx.fillStyle = pal.rule;
    ctx.fillRect(88, 144, 848, 3);

    // Large, high-contrast serif heading wrapped on word boundaries
    ctx.fillStyle = pal.ink;
    ctx.font = '600 54px "Newsreader", Georgia, serif';
    const headingText = side === 'front' ? spread.heading : spread.backHeading;
    const headingLines = wrapTextLines(ctx, headingText, 848);
    headingLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 88, 226 + i * 66);
    });

    // Clear readable body lines
    ctx.fillStyle = pal.muted;
    ctx.font = '500 34px "Instrument Sans", sans-serif';
    const bodyLines = side === 'front' ? spread.lines : spread.backLines;
    bodyLines.forEach((line, idx) => {
      ctx.fillText(line, 88, 382 + idx * 54);
    });

    // Highlighted callout strip
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(88, 566, 848, 92);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(88, 566, 12, 92);
    ctx.fillStyle = pal.ink;
    ctx.font = '600 30px "Instrument Sans", sans-serif';
    ctx.fillText(spread.callout, 124, 623);

    // Crisp vector textbook figure
    const figY = 708;
    const figH = 224;
    ctx.strokeStyle = pal.rule;
    ctx.lineWidth = 3;
    ctx.strokeRect(88, figY, 848, figH);

    if (spread.diagram === 'wave') {
      ctx.beginPath();
      for (let x = 0; x <= 768; x += 10) {
        const y = figY + 124 - Math.sin(x * 0.022) * 48 - x * 0.04;
        if (x === 0) ctx.moveTo(128 + x, y);
        else ctx.lineTo(128 + x, y);
      }
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (spread.diagram === 'bars') {
      const heights = [76, 138, 104, 168, 126, 148];
      heights.forEach((h, i) => {
        ctx.fillStyle = i === 3 ? pal.accent : pal.muted;
        ctx.globalAlpha = i === 3 ? 0.96 : 0.36;
        ctx.fillRect(142 + i * 124, figY + figH - 22 - h, 68, h);
      });
      ctx.globalAlpha = 1;
    } else {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 3 === 0 ? pal.accent : pal.muted;
          ctx.globalAlpha = (r + c) % 3 === 0 ? 0.8 : 0.25;
          ctx.fillRect(140 + c * 188, figY + 34 + r * 58, 148, 34);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  return configureSharpTexture(canvas, anisotropy);
}

function HardcoverBook({
  chapterProgressRef,
  spreadIndex,
  theme,
  pointerRef,
  onTurnNext,
}: {
  chapterProgressRef: React.MutableRefObject<number>;
  spreadIndex: number;
  theme: ReaderThemeId;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  onTurnNext?: () => void;
}) {
  const maxAnisotropy = useThree(({ gl }) => gl.capabilities.getMaxAnisotropy());
  const rootRef = useRef<THREE.Group | null>(null);
  const pageRefs = useRef<(THREE.Group | null)[]>([]);
  // Initial angles ordered so idx=0 (Ch. 1) is TOPMOST on right stack
  const smoothAngles = useRef<number[]>([0.24, 0.18, 0.13, 0.08]);
  const smoothPointer = useRef({ x: 0, y: 0 });

  const pal = THEME_PALETTE[theme];

  const pagePairs = useMemo(
    () => [
      createArchedPagePair(1.52, 2.02, 0.1),
      createArchedPagePair(1.52, 2.02, 0.095),
      createArchedPagePair(1.52, 2.02, 0.09),
      createArchedPagePair(1.52, 2.02, 0.085),
    ],
    [],
  );

  const tocTexture = useMemo(
    () => createInsideLeftTocTexture(theme, maxAnisotropy),
    [theme, maxAnisotropy],
  );

  const pageTextures = useMemo(
    () =>
      PAGE_SPREADS.map((spread, idx) => ({
        front: createPageTexture(spread, idx, theme, 'front', maxAnisotropy),
        back: createPageTexture(spread, idx, theme, 'back', maxAnisotropy),
      })),
    [theme, maxAnisotropy],
  );

  useEffect(() => {
    return () => {
      pagePairs.forEach((p) => {
        p.front.dispose();
        p.back.dispose();
      });
    };
  }, [pagePairs]);

  useEffect(() => {
    return () => {
      tocTexture.dispose();
      pageTextures.forEach((t) => {
        t.front.dispose();
        t.back.dispose();
      });
    };
  }, [tocTexture, pageTextures]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const p = chapterProgressRef.current;
    const ease = 1 - Math.exp(-6.5 * dt);

    smoothPointer.current.x += (pointerRef.current.x - smoothPointer.current.x) * ease;
    smoothPointer.current.y += (pointerRef.current.y - smoothPointer.current.y) * ease;

    if (rootRef.current) {
      rootRef.current.rotation.y =
        -0.18 + p * 0.34 + smoothPointer.current.x * 0.2 + Math.sin(t * 0.45) * 0.028;
      rootRef.current.rotation.x = 0.26 - p * 0.06 - smoothPointer.current.y * 0.1;
      rootRef.current.position.y = -0.04 + Math.sin(t * 0.85) * 0.025;
    }

    // Correct physical stacking:
    // - Right stack: lower idx (active chapter) has LARGER angle so it sits visibly on top.
    // - Left stack: higher turned idx has SMALLER angle (further from PI) so it lands on top of earlier turned pages.
    pageRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      const isTurnedLeft = i < spreadIndex;
      const scrollLift = Math.max(0, (p - 0.35) * 0.12);
      const targetAngle = isTurnedLeft
        ? Math.PI - 0.1 - i * 0.065
        : 0.08 + (3 - i) * 0.052 + (i === spreadIndex ? scrollLift : 0);

      smoothAngles.current[i] +=
        (targetAngle - smoothAngles.current[i]) * (1 - Math.exp(-7.5 * dt));
      pivot.rotation.z = smoothAngles.current[i] + Math.sin(t * 0.85 + i * 0.7) * 0.01;
    });
  });

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        onTurnNext?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Left & Right Graphite Hardcover Boards */}
      <RoundedBox
        args={[1.68, 0.065, 2.2]}
        radius={0.02}
        position={[-0.86, -0.08, 0]}
        rotation={[0, 0, -0.1]}
      >
        <meshStandardMaterial color="#1f2127" roughness={0.5} metalness={0.24} />
      </RoundedBox>
      <RoundedBox
        args={[1.68, 0.065, 2.2]}
        radius={0.02}
        position={[0.86, -0.08, 0]}
        rotation={[0, 0, 0.1]}
      >
        <meshStandardMaterial color="#1f2127" roughness={0.5} metalness={0.24} />
      </RoundedBox>

      {/* Luminous Warm Amber Spine Hinge */}
      <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 2.22, 24]} />
        <meshStandardMaterial color="#e58b4a" roughness={0.26} metalness={0.68} />
      </mesh>

      {/* Left Solid Page Block + Printed Inside-Left TOC Page */}
      <group position={[-0.8, 0.02, 0]} rotation={[0, 0, -0.1]}>
        <mesh>
          <boxGeometry args={[1.54, 0.14, 2.04]} />
          <meshStandardMaterial color={pal.pageAlt} roughness={0.86} />
        </mesh>
        <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 2.0]} />
          <meshStandardMaterial map={tocTexture} roughness={0.84} metalness={0.03} />
        </mesh>
      </group>

      {/* Right Solid Page Block */}
      <mesh position={[0.8, 0.02, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[1.54, 0.14, 2.04]} />
        <meshStandardMaterial color={pal.pageAlt} roughness={0.86} />
      </mesh>

      {/* 4 Interactive Arched Turning Folio Pages (Correct Stack Order + High-DPI Sharp Textures) */}
      {pagePairs.map((pair, idx) => (
        <group
          key={idx}
          ref={(el) => {
            pageRefs.current[idx] = el;
          }}
          position={[0, 0.11 + (3 - idx) * 0.005, 0]}
          rotation={[0, 0, 0.08 + (3 - idx) * 0.052]}
        >
          <mesh geometry={pair.front}>
            <meshStandardMaterial
              map={pageTextures[idx].front}
              roughness={0.82}
              metalness={0.02}
              side={THREE.FrontSide}
            />
          </mesh>
          <mesh geometry={pair.back}>
            <meshStandardMaterial
              map={pageTextures[idx].back}
              roughness={0.82}
              metalness={0.02}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

class FlipbookErrorBoundary extends Component<
  { onError?: () => void; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch() {
    this.props.onError?.();
  }
  override render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default function Flipbook3DScene({
  chapterProgressRef,
  spreadIndex,
  theme,
  pointerRef,
  active = true,
  onTurnNext,
  onFallback,
}: Flipbook3DSceneProps) {
  const pal = THEME_PALETTE[theme];

  return (
    <FlipbookErrorBoundary onError={onFallback}>
      <Canvas
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0.02, 2.38, 4.25], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault();
              onFallback?.();
            },
            { once: true },
          );
        }}
        className="h-full w-full"
      >
        <ambientLight intensity={theme === 'night' ? 0.65 : 0.85} color="#fffcf7" />
        <directionalLight
          position={[2.8, 6.2, 4.5]}
          intensity={theme === 'night' ? 1.4 : 1.7}
          color={pal.keyLight}
        />
        <directionalLight position={[-4, 2.4, -1.5]} intensity={0.55} color="#dbeafe" />
        <pointLight position={[-1.4, 2.1, -1.0]} intensity={2.1} color={pal.lampColor} distance={10} />

        <HardcoverBook
          chapterProgressRef={chapterProgressRef}
          spreadIndex={spreadIndex}
          theme={theme}
          pointerRef={pointerRef}
          onTurnNext={onTurnNext}
        />

        <ContactShadows
          frames={1}
          position={[0, -0.78, 0]}
          opacity={0.48}
          scale={7}
          blur={2.5}
          far={3}
          color="#000000"
        />
      </Canvas>
    </FlipbookErrorBoundary>
  );
}

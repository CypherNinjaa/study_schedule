import { Component, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Hero3DSceneProps {
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: React.MutableRefObject<number>;
  /** Pauses the WebGL frameloop automatically when scrolled off-screen */
  active?: boolean;
  /** Called if WebGL fails or loses context so the parent can show the static fallback */
  onFallback?: () => void;
}

/**
 * Builds a centered, thin, Apple-machined rounded rectangle slab where X/Y corner
 * radius is independent of the thin Z thickness.
 */
function createRoundedPanelGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0.014,
): THREE.ExtrudeGeometry {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw * 0.45, hh * 0.45);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.center();
  return geo;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Crisp procedural CanvasTexture for the Pomodoro satellite readout */
function createPomodoroFaceTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(2, 2);
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, 512, 512);

    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 230);
    grad.addColorStop(0, 'rgba(229, 139, 74, 0.14)');
    grad.addColorStop(1, 'rgba(21, 23, 27, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4f2ec';
    ctx.font = '600 70px "JetBrains Mono", monospace';
    ctx.fillText('25:00', 256, 268);

    ctx.fillStyle = '#e58b4a';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('PiP FOCUS', 256, 314);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.max(4, anisotropy);
  return tex;
}

/** Crisp procedural CanvasTexture for the Timetable satellite card */
function createTimetableCardTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(1024 / 640, 1024 / 480);
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, 640, 480);

    ctx.fillStyle = '#5c5952';
    ctx.font = '600 24px "Instrument Sans", sans-serif';
    ctx.fillText('MONDAY · 6 CLASSES', 44, 68);

    ctx.fillStyle = '#d97706';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('4h 30m', 596, 68);
    ctx.textAlign = 'left';

    const rows = [
      { y: 108, bar: '#d97706', title: 'Time Series Analysis', meta: '08:30 · LAB-3' },
      { y: 218, bar: '#0d9488', title: 'Data Science Intro', meta: '09:20 · LAB-2' },
      { y: 328, bar: '#6d4ca0', title: 'Data Visualization', meta: '10:10 · RM 201' },
    ];
    for (const row of rows) {
      drawRoundedRect(ctx, 44, row.y, 552, 92, 18);
      ctx.fillStyle = '#f2efe8';
      ctx.fill();

      drawRoundedRect(ctx, 60, row.y + 18, 12, 56, 6);
      ctx.fillStyle = row.bar;
      ctx.fill();

      ctx.fillStyle = '#141413';
      ctx.font = '600 28px "Instrument Sans", sans-serif';
      ctx.fillText(row.title, 92, row.y + 44);

      ctx.fillStyle = '#5c5952';
      ctx.font = '500 22px "JetBrains Mono", monospace';
      ctx.fillText(row.meta, 92, row.y + 76);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.max(4, anisotropy);
  return tex;
}

/** Crisp procedural CanvasTexture for the Local JSON Vault satellite pill */
function createVaultPillTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(1024 / 640, 512 / 280);
    ctx.fillStyle = '#16181c';
    ctx.fillRect(0, 0, 640, 280);

    drawRoundedRect(ctx, 36, 44, 16, 192, 8);
    ctx.fillStyle = '#e58b4a';
    ctx.fill();

    ctx.fillStyle = '#f4f2ec';
    ctx.font = '600 32px "JetBrains Mono", monospace';
    ctx.fillText('productivity-data.json', 82, 126);

    ctx.fillStyle = '#a5a097';
    ctx.font = '500 24px "Instrument Sans", sans-serif';
    ctx.fillText('Autosaved locally · 2 ms · Gist ready', 82, 178);

    ctx.beginPath();
    ctx.arc(582, 140, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#4abe78';
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.max(4, anisotropy);
  return tex;
}

/** Subtle diagonal studio glass reflection overlay for the main display slab */
function createScreenSheenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 420, 256);
    grad.addColorStop(0, 'rgba(255, 252, 245, 0.14)');
    grad.addColorStop(0.28, 'rgba(255, 252, 245, 0.04)');
    grad.addColorStop(0.45, 'rgba(255, 252, 245, 0)');
    grad.addColorStop(1, 'rgba(255, 252, 245, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Floating 3D Workspace Slab + Translucent Glass Domain Artifacts.
 * Includes responsive camera scaling for tablets and scroll-linked depth motion.
 */
function WorkspaceRig({
  pointerRef,
  scrollProgressRef,
}: {
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: React.MutableRefObject<number>;
}) {
  const { camera, size, gl } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  const groupRef = useRef<THREE.Group | null>(null);
  const ringRef = useRef<THREE.Group | null>(null);
  const satLeftRef = useRef<THREE.Group | null>(null);
  const satRightRef = useRef<THREE.Group | null>(null);
  const satVaultRef = useRef<THREE.Group | null>(null);
  const smoothPointer = useRef({ x: 0, y: 0 });
  const smoothScroll = useRef(0);

  // Precision rounded slab geometries (disposed cleanly on unmount)
  const geos = useMemo(
    () => ({
      chassis: createRoundedPanelGeometry(4.52, 2.78, 0.11, 0.18, 0.02),
      bezel: createRoundedPanelGeometry(4.38, 2.66, 0.03, 0.13, 0.008),
      satLeftCard: createRoundedPanelGeometry(1.16, 1.16, 0.075, 0.2, 0.016),
      satLeftFace: createRoundedPanelGeometry(0.96, 0.96, 0.02, 0.13, 0.006),
      satRightCard: createRoundedPanelGeometry(1.42, 1.04, 0.075, 0.17, 0.016),
      vaultCard: createRoundedPanelGeometry(1.48, 0.62, 0.068, 0.15, 0.014),
    }),
    [],
  );

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const screen = loader.load('/landing/screen-dashboard.webp', (loaded) => {
      loaded.needsUpdate = true;
    });
    screen.colorSpace = THREE.SRGBColorSpace;
    screen.generateMipmaps = true;
    screen.minFilter = THREE.LinearMipmapLinearFilter;
    screen.magFilter = THREE.LinearFilter;
    screen.anisotropy = Math.max(4, maxAnisotropy);

    return {
      screen,
      sheen: createScreenSheenTexture(),
      pomodoroFace: createPomodoroFaceTexture(maxAnisotropy),
      timetableFace: createTimetableCardTexture(maxAnisotropy),
      vaultFace: createVaultPillTexture(maxAnisotropy),
    };
  }, [maxAnisotropy]);

  useEffect(() => {
    return () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(textures).forEach((t) => t.dispose());
    };
  }, [geos, textures]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const ease = 1 - Math.exp(-5.5 * dt);

    smoothPointer.current.x += (pointerRef.current.x - smoothPointer.current.x) * ease;
    smoothPointer.current.y += (pointerRef.current.y - smoothPointer.current.y) * ease;
    smoothScroll.current += (scrollProgressRef.current - smoothScroll.current) * ease;

    const sp = smoothScroll.current;
    const px = smoothPointer.current.x;
    const py = smoothPointer.current.y;

    // Responsive camera distance: pull back gently on narrower tablet viewports so satellites never clip
    const aspect = size.width / Math.max(1, size.height);
    const baseZ = aspect < 1.85 ? 8.15 : aspect < 2.15 ? 6.8 : 5.95;
    camera.position.z = baseZ - sp * 0.55;
    camera.position.y = 0.12 + sp * 0.32 - py * 0.08;
    camera.position.x = px * 0.16;
    camera.lookAt(0, 0.06 - sp * 0.1, 0);

    if (groupRef.current) {
      groupRef.current.rotation.y = -0.13 + px * 0.15 + sp * 0.18;
      groupRef.current.rotation.x = 0.07 - py * 0.08 + sp * 0.14;
      groupRef.current.position.y = 0.12 + Math.sin(t * 0.85) * 0.025 - sp * 0.14;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.24;
    }

    // Staggered spatial parallax across floating domain satellites
    if (satLeftRef.current) {
      satLeftRef.current.position.x = -2.72 - sp * 0.22 + px * 0.08;
      satLeftRef.current.position.y = 0.34 + Math.sin(t * 1.1) * 0.05 + sp * 0.18;
    }
    if (satRightRef.current) {
      satRightRef.current.position.x = 2.84 + sp * 0.24 + px * 0.1;
      satRightRef.current.position.y = 0.48 + Math.sin(t * 0.95 + 1.4) * 0.045 + sp * 0.22;
    }
    if (satVaultRef.current) {
      satVaultRef.current.position.x = 2.16 + sp * 0.16 + px * 0.14;
      satVaultRef.current.position.y = -0.78 + Math.sin(t * 1.2 + 2.6) * 0.04 - sp * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Tilted Anodized Aluminum & Graphite Display Slab */}
      <group position={[0, 0.06, 0]}>
        {/* Outer precision brushed aluminum chassis */}
        <mesh geometry={geos.chassis}>
          <meshStandardMaterial color="#d8d4cb" metalness={0.62} roughness={0.26} />
        </mesh>
        {/* Inner deep obsidian bezel */}
        <mesh geometry={geos.bezel} position={[0, 0, 0.062]}>
          <meshStandardMaterial color="#111215" metalness={0.22} roughness={0.22} />
        </mesh>
        {/* Real Study Schedule Dashboard Screen Surface */}
        <mesh position={[0, 0, 0.09]}>
          <planeGeometry args={[4.16, 2.48]} />
          <meshBasicMaterial map={textures.screen} toneMapped={false} />
        </mesh>
        {/* Subtle studio glass sheen */}
        <mesh position={[0, 0, 0.093]}>
          <planeGeometry args={[4.16, 2.48]} />
          <meshBasicMaterial map={textures.sheen} transparent depthWrite={false} />
        </mesh>
      </group>

      {/* Floating Satellite 1 (Left, mid-foreground): Pomodoro Focus Ring */}
      <group ref={satLeftRef} position={[-2.72, 0.34, 0.52]} rotation={[0.08, 0.34, -0.04]}>
        <mesh geometry={geos.satLeftCard}>
          <meshStandardMaterial
            color="#f5f2eb"
            roughness={0.22}
            metalness={0.18}
            transparent
            opacity={0.96}
          />
        </mesh>
        <mesh geometry={geos.satLeftFace} position={[0, 0, 0.048]}>
          <meshStandardMaterial color="#15171b" roughness={0.38} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.066]}>
          <planeGeometry args={[0.88, 0.88]} />
          <meshBasicMaterial map={textures.pomodoroFace} toneMapped={false} />
        </mesh>
        {/* Rotating 3D Amber Focus Ring overlaying dial */}
        <group ref={ringRef} position={[0, 0, 0.082]}>
          <mesh>
            <torusGeometry args={[0.31, 0.018, 14, 48]} />
            <meshStandardMaterial color="#2c2f36" roughness={0.5} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.31, 0.026, 14, 48, Math.PI * 1.48]} />
            <meshStandardMaterial color="#e58b4a" metalness={0.42} roughness={0.24} />
          </mesh>
          <mesh position={[0.31, 0, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#d97706"
              emissiveIntensity={0.28}
              metalness={0.45}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* Floating Satellite 2 (Right, mid-depth): Structured Weekly Timetable Card */}
      <group ref={satRightRef} position={[2.84, 0.48, 0.36]} rotation={[0.06, -0.32, 0.03]}>
        <mesh geometry={geos.satRightCard}>
          <meshStandardMaterial
            color="#ebe7de"
            roughness={0.24}
            metalness={0.22}
            transparent
            opacity={0.96}
          />
        </mesh>
        <mesh position={[0, 0, 0.056]}>
          <planeGeometry args={[1.28, 0.91]} />
          <meshBasicMaterial map={textures.timetableFace} toneMapped={false} />
        </mesh>
      </group>

      {/* Floating Satellite 3 (Bottom-Right, foreground): Tactile Local JSON Vault */}
      <group ref={satVaultRef} position={[2.16, -0.78, 0.94]} rotation={[-0.1, -0.24, -0.03]}>
        <mesh geometry={geos.vaultCard}>
          <meshStandardMaterial color="#1b1d22" roughness={0.32} metalness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[1.36, 0.52]} />
          <meshBasicMaterial map={textures.vaultFace} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

class SceneErrorBoundary extends Component<
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
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function Hero3DScene({
  pointerRef,
  scrollProgressRef,
  active = true,
  onFallback,
}: Hero3DSceneProps) {
  return (
    <SceneErrorBoundary onError={onFallback}>
      <Canvas
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0.12, 5.9], fov: 34 }}
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
        <ambientLight intensity={0.95} color="#fffcf7" />
        <directionalLight position={[4.5, 6, 5]} intensity={1.65} color="#fff7eb" />
        <directionalLight position={[-5, 2.5, 3]} intensity={0.68} color="#dbeafe" />
        <pointLight position={[0, -2.5, 3.2]} intensity={0.9} color="#e58b4a" distance={10} />

        <WorkspaceRig pointerRef={pointerRef} scrollProgressRef={scrollProgressRef} />

        <ContactShadows
          frames={1}
          position={[0, -1.62, 0]}
          opacity={0.26}
          scale={11.5}
          blur={2.5}
          far={4}
          color="#141413"
        />
      </Canvas>
    </SceneErrorBoundary>
  );
}

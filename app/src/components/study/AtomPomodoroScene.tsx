import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PomodoroPhase } from '@/store/usePomodoroStore';
import type { QuantumTheme } from './quantumThemes';

/* ============================================================================
   CUSTOM GPU SHADER FOR THE 4k–6k QUANTUM PARTICLES
   ============================================================================ */
const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 customColor;

  uniform float uPixelRatio;
  uniform float uPaused;
  uniform float uCollapsePhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Smoothly desaturate to crisp silver-grey when paused so digits stay readable
    vec3 grey = vec3(0.74, 0.79, 0.86);
    vColor = mix(customColor, grey, uPaused * 0.88);
    vAlpha = aAlpha * mix(1.0, 0.88, uPaused);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float scaleBoost = 1.0 + uCollapsePhase * 0.45;
    gl_PointSize = aSize * scaleBoost * uPixelRatio * (195.0 / max(0.5, -mvPosition.z));
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsCrystal;
  uniform float uIsMatrix;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist;

    if (uIsCrystal > 0.5) {
      // Sharp diamond / crystal facet metric (L1 Manhattan norm)
      dist = (abs(uv.x) + abs(uv.y)) * 1.45;
    } else if (uIsMatrix > 0.5) {
      // Crisp digital phosphor square-core with soft edge
      dist = max(abs(uv.x), abs(uv.y)) * 1.85;
    } else {
      // Soft radial energy orb
      dist = length(uv) * 2.0;
    }

    if (dist > 1.0) discard;

    float core = smoothstep(1.0, 0.0, dist);
    float glow = pow(core, uIsCrystal > 0.5 ? 1.35 : 1.75);

    // Bright white-hot center blending into particle color
    vec3 finalColor = mix(vColor, vec3(1.0), pow(core, 3.2) * 0.55);
    gl_FragColor = vec4(finalColor, glow * vAlpha);
  }
`;

/* ============================================================================
   PER-CHARACTER SLOT RASTERIZER
   Ensures when a single digit changes (e.g. 24:58 -> 24:57), ONLY that slot's
   particles break apart and re-form while all unchanged digits stay 100% still!
   ============================================================================ */
const charPixelCache = new Map<string, [number, number][]>();

function getCharacterPixels(char: string, totalChars: number, slotIndex: number): [number, number][] {
  const key = `${char}_${totalChars}_${slotIndex}`;
  const cached = charPixelCache.get(key);
  if (cached) return cached;

  const width = 96;
  const height = 112;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pixels: [number, number][] = [];

  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 84px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(char, width / 2, height / 2);

    const data = ctx.getImageData(0, 0, width, height).data;

    // Total width in 3D space across all character slots
    const slotSpacing = totalChars > 5 ? 0.44 : 0.50;
    const centerOffset = ((totalChars - 1) * slotSpacing) / 2;
    const slotCenterX = slotIndex * slotSpacing - centerOffset;
    const charWidth3D = totalChars > 5 ? 0.42 : 0.48;
    const charHeight3D = totalChars > 5 ? 0.72 : 0.82;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 115) {
          const lx = slotCenterX + ((x / width) - 0.5) * charWidth3D;
          const ly = (0.5 - (y / height)) * charHeight3D;
          pixels.push([lx, ly]);
        }
      }
    }
  }

  if (pixels.length === 0) {
    pixels.push([0, 0]);
  }
  charPixelCache.set(key, pixels);
  return pixels;
}

/* ============================================================================
   MAIN 3D QUANTUM ATOM + NUCLEUS CLOCK SYSTEM
   ============================================================================ */
interface QuantumSystemProps {
  timeText: string;
  progress: number;
  running: boolean;
  alerting: boolean;
  phase: PomodoroPhase;
  theme: QuantumTheme;
  subjectColor: string | null;
  totalParticleBudget: number;
  isTabHidden: boolean;
}

function QuantumAtomSystem({
  timeText,
  progress,
  running,
  alerting,
  phase,
  theme,
  subjectColor,
  totalParticleBudget,
  isTabHidden,
}: QuantumSystemProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);

  // 3D pointer hover coordinate in local space (updated without React re-renders)
  const hoverPointRef = useRef<THREE.Vector3>(new THREE.Vector3(999, 999, 999));
  const hoverActiveRef = useRef<boolean>(false);

  // Track paused interpolation & supernova elapsed time
  const pausedMixRef = useRef<number>(running ? 0 : 1);
  const supernovaStartRef = useRef<number | null>(null);
  const prevCharsRef = useRef<string>('');
  const frameSkipRef = useRef<number>(0);

  // Electron colour matches the selected subject's colour, or falls back to theme orbitColor
  const effectiveElectronColor = subjectColor || theme.orbitColor;

  // Partition particle budget:
  // ~65% form the Nucleus Digits + Nucleus Quantum Core
  // ~35% form the 3 Electron Orbital Rings & Ambient Cloud
  const totalCount = theme.isLowPower ? 1250 : totalParticleBudget;
  const digitCount = Math.floor(totalCount * 0.56);
  const nucleusCloudCount = Math.floor(totalCount * 0.14);
  const orbitCount = totalCount - digitCount - nucleusCloudCount;

  // Allocate typed arrays once per totalCount
  const buffers = useMemo(() => {
    const positions = new Float32Array(totalCount * 3);
    const velocities = new Float32Array(totalCount * 3);
    const targets = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    const alphas = new Float32Array(totalCount);
    // meta: [role(0=digit,1=nucleusCloud,2=orbit), shellOrSlot, angle, speedOrSeed]
    const meta = new Float32Array(totalCount * 4);

    // Initialize positions & metadata
    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      if (i < digitCount) {
        // Role 0: Nucleus Clock Digit Particle
        meta[i4] = 0;
        meta[i4 + 1] = 0; // slot index assigned dynamically
        meta[i4 + 2] = Math.random() * Math.PI * 2;
        meta[i4 + 3] = (Math.random() - 0.5) * 0.05; // z thickness offset
        positions[i3] = (Math.random() - 0.5) * 1.6;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.9;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.4;
        sizes[i] = theme.isLowPower ? 0.11 : 0.088 + (i % 4) * 0.01;
        alphas[i] = 0.96;
      } else if (i < digitCount + nucleusCloudCount) {
        // Role 1: Inner Nucleus Quantum Halo Cloud
        meta[i4] = 1;
        const r = 1.15 + Math.random() * 0.55;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        meta[i4 + 1] = r;
        meta[i4 + 2] = theta;
        meta[i4 + 3] = phi;
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        positions[i3 + 2] = r * Math.cos(phi) * 0.5;
        sizes[i] = 0.075 + Math.random() * 0.04;
        alphas[i] = 0.55;
      } else {
        // Role 2: 3 Electron Orbital Rings (trail particles)
        meta[i4] = 2;
        const ringIdx = i % 3; // 3 Bohr orbital shells
        const normalizedPosOnRing = ((i - digitCount - nucleusCloudCount) / Math.max(1, orbitCount));
        const angle = normalizedPosOnRing * Math.PI * 2;
        const radialSpread = (Math.random() - 0.5) * (theme.isNebulaCloud ? 0.42 : 0.14);
        meta[i4 + 1] = ringIdx;
        meta[i4 + 2] = angle;
        meta[i4 + 3] = radialSpread;
        sizes[i] = 0.09 + (i % 3) * 0.025;
        alphas[i] = 0.85;
      }
    }

    return { positions, velocities, targets, colors, sizes, alphas, meta };
  }, [totalCount, digitCount, nucleusCloudCount, orbitCount, theme.isLowPower, theme.isNebulaCloud]);

  // 3 Tilted Bohr Orbital Ring Configurations
  const orbitalRings = useMemo(
    () => [
      { rx: 2.75, ry: 1.55, tilt: new THREE.Euler(0.58, 0.32, 0.24), speed: 1.15 },
      { rx: 2.85, ry: 1.62, tilt: new THREE.Euler(-0.58, 0.42, -0.45), speed: -0.95 },
      { rx: 2.95, ry: 1.68, tilt: new THREE.Euler(0.18, -0.78, 1.05), speed: 1.3 },
    ],
    [],
  );

  const valenceElectronRefs = useRef<(THREE.Mesh | null)[]>([]);
  const orbitRingRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Update particle colors whenever theme or subjectColor changes
  useEffect(() => {
    if (!pointsRef.current) return;
    const cCore = new THREE.Color(theme.coreColor);
    const cSecondary = new THREE.Color(theme.secondaryColor);
    const cElectron = new THREE.Color(effectiveElectronColor);
    const cWhite = new THREE.Color('#ffffff');

    const colorAttr = pointsRef.current.geometry.getAttribute('customColor') as THREE.BufferAttribute;
    if (!colorAttr) return;

    for (let i = 0; i < totalCount; i++) {
      const role = buffers.meta[i * 4];
      if (role === 0) {
        // Digit particles: crisp bright core tinted with theme.coreColor
        const c = cWhite.clone().lerp(cCore, (i % 5) * 0.14);
        colorAttr.setXYZ(i, c.r, c.g, c.b);
      } else if (role === 1) {
        // Nucleus cloud: secondary color
        const c = cCore.clone().lerp(cSecondary, (i % 7) / 7);
        colorAttr.setXYZ(i, c.r, c.g, c.b);
      } else {
        // Electron orbit particles: match selected subject's colour!
        const c = cElectron.clone().lerp(cSecondary, (i % 4) * 0.08);
        colorAttr.setXYZ(i, c.r, c.g, c.b);
      }
    }
    colorAttr.needsUpdate = true;
  }, [theme, effectiveElectronColor, totalCount, buffers]);

  // Per-Digit Target Update: ONLY particles belonging to changed character slots break apart!
  useEffect(() => {
    const prevText = prevCharsRef.current;
    prevCharsRef.current = timeText;

    const numSlots = Math.max(1, timeText.length);
    const particlesPerSlot = Math.floor(digitCount / numSlots);

    for (let slot = 0; slot < numSlots; slot++) {
      const char = timeText[slot] || ' ';
      const prevChar = prevText[slot];
      const didSlotChange = prevText.length !== timeText.length || prevChar !== char;

      const slotPixels = getCharacterPixels(char, numSlots, slot);
      const startIdx = slot * particlesPerSlot;
      const endIdx = slot === numSlots - 1 ? digitCount : (slot + 1) * particlesPerSlot;

      for (let i = startIdx; i < endIdx; i++) {
        const i3 = i * 3;
        const pick = slotPixels[(i * 13) % slotPixels.length];
        const zOffset = buffers.meta[i * 4 + 3];

        buffers.targets[i3] = pick[0];
        buffers.targets[i3 + 1] = pick[1];
        buffers.targets[i3 + 2] = zOffset;

        // ONLY break apart this slot's particles if this specific digit changed!
        if (didSlotChange && prevText !== '') {
          if (theme.isMatrixGlitch) {
            // Matrix theme: digital vertical glitch displacement on digit change
            buffers.positions[i3 + 1] += ((i % 2 === 0 ? 1 : -1) * (0.22 + Math.random() * 0.25));
            buffers.velocities[i3] += (Math.random() - 0.5) * 0.08;
            buffers.velocities[i3 + 1] += (Math.random() - 0.5) * 0.14;
          } else {
            // Quantum radial scatter burst ONLY on the changed digit
            const burstAngle = buffers.meta[i * 4 + 2] + performance.now() * 0.003;
            const burstSpeed = 0.045 + (i % 7) * 0.008;
            buffers.velocities[i3] += Math.cos(burstAngle) * burstSpeed;
            buffers.velocities[i3 + 1] += Math.sin(burstAngle) * burstSpeed;
            buffers.velocities[i3 + 2] += (Math.random() - 0.5) * burstSpeed * 1.6;
          }
        }
      }
    }
  }, [timeText, digitCount, buffers, theme.isMatrixGlitch]);

  // Track completion supernova start timestamp
  useEffect(() => {
    if (alerting) {
      supernovaStartRef.current = performance.now();
    } else {
      supernovaStartRef.current = null;
    }
  }, [alerting]);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uPaused: { value: running ? 0.0 : 1.0 },
      uCollapsePhase: { value: 0.0 },
      uIsCrystal: { value: theme.isCrystalline ? 1.0 : 0.0 },
      uIsMatrix: { value: theme.isMatrixGlitch ? 1.0 : 0.0 },
    }),
    [],
  );

  useEffect(() => {
    if (!shaderMatRef.current) return;
    shaderMatRef.current.uniforms.uIsCrystal.value = theme.isCrystalline ? 1.0 : 0.0;
    shaderMatRef.current.uniforms.uIsMatrix.value = theme.isMatrixGlitch ? 1.0 : 0.0;
  }, [theme]);

  useFrame((state, delta) => {
    // Render at a lower rate when tab is hidden
    if (isTabHidden) {
      frameSkipRef.current = (frameSkipRef.current + 1) % 6;
      if (frameSkipRef.current !== 0) return;
    }

    const t = state.clock.getElapsedTime();
    const isPaused = !running && !alerting;

    // Smoothly transition paused grey state
    const targetPausedMix = isPaused ? 1.0 : 0.0;
    pausedMixRef.current += (targetPausedMix - pausedMixRef.current) * Math.min(1, delta * 6);

    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uPaused.value = pausedMixRef.current;
    }

    // Supernova Collapse & Burst envelope when alerting
    let supernovaFactor = 0; // < 0 means collapse inward, > 0 means supernova burst outward
    if (alerting && supernovaStartRef.current !== null) {
      const elapsedSec = (performance.now() - supernovaStartRef.current) / 1000;
      if (elapsedSec < 0.42) {
        // Phase 1: Atom collapses into the nucleus
        supernovaFactor = -Math.sin((elapsedSec / 0.42) * (Math.PI / 2)) * 0.78;
      } else if (elapsedSec < 1.9) {
        // Phase 2: Supernova radial explosion before reforming
        const burstT = (elapsedSec - 0.42) / 1.48;
        supernovaFactor = Math.sin(burstT * Math.PI) * 1.65;
      }
      if (shaderMatRef.current) {
        shaderMatRef.current.uniforms.uCollapsePhase.value = Math.abs(supernovaFactor);
      }
    } else if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uCollapsePhase.value = 0;
    }

    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = pointsRef.current.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;

    const hoverPt = hoverPointRef.current;
    const hoverActive = hoverActiveRef.current;

    // Phase & Orbital Decay Physics:
    // - Focus: tight, stable atom; orbits decay inward toward nucleus as progress -> 1
    // - Break: calmer, wider cloud
    const orbitalDecay = phase === 'focus' ? 1.0 - progress * 0.28 : 1.24;
    const motionScale = (1.0 - pausedMixRef.current * 0.98) * theme.speedMultiplier;

    const vTemp = new THREE.Vector3();

    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const role = buffers.meta[i4];

      if (role === 0) {
        // 1. NUCLEUS DIGIT PARTICLES
        let tx = buffers.targets[i3];
        let ty = buffers.targets[i3 + 1];
        let tz = buffers.targets[i3 + 2];

        if (supernovaFactor !== 0) {
          const scale = 1.0 + supernovaFactor * 1.4;
          tx *= scale;
          ty *= scale;
          tz += Math.sin(i * 0.5 + t * 8) * supernovaFactor * 0.6;
        }

        // Hover repulsion on nucleus particles
        if (hoverActive) {
          const dx = buffers.positions[i3] - hoverPt.x;
          const dy = buffers.positions[i3 + 1] - hoverPt.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < 0.42 && dSq > 0.0001) {
            const d = Math.sqrt(dSq);
            const force = ((0.65 - d) / 0.65) * 0.055;
            buffers.velocities[i3] += (dx / d) * force;
            buffers.velocities[i3 + 1] += (dy / d) * force;
            buffers.velocities[i3 + 2] += (Math.random() - 0.5) * force;
          }
        }

        // Spring back to target digit coordinate
        const spring = 0.18;
        const damping = 0.76;
        buffers.velocities[i3] = (buffers.velocities[i3] + (tx - buffers.positions[i3]) * spring) * damping;
        buffers.velocities[i3 + 1] =
          (buffers.velocities[i3 + 1] + (ty - buffers.positions[i3 + 1]) * spring) * damping;
        buffers.velocities[i3 + 2] =
          (buffers.velocities[i3 + 2] + (tz - buffers.positions[i3 + 2]) * spring) * damping;

        buffers.positions[i3] += buffers.velocities[i3];
        buffers.positions[i3 + 1] += buffers.velocities[i3 + 1];
        buffers.positions[i3 + 2] += buffers.velocities[i3 + 2];

        posAttr.setXYZ(i, buffers.positions[i3], buffers.positions[i3 + 1], buffers.positions[i3 + 2]);
      } else if (role === 1) {
        // 2. NUCLEUS QUANTUM CLOUD
        if (!isPaused || supernovaFactor !== 0) {
          const baseR = buffers.meta[i4 + 1] * (phase === 'break' ? 1.3 : 1.0) * (1 + supernovaFactor);
          const theta = buffers.meta[i4 + 2] + t * 0.45 * motionScale;
          const phi = buffers.meta[i4 + 3] + Math.sin(t * 0.6 + i) * 0.2;

          let nx = baseR * Math.sin(phi) * Math.cos(theta);
          let ny = baseR * Math.sin(phi) * Math.sin(theta) * 0.68;
          let nz = baseR * Math.cos(phi) * 0.45;

          if (hoverActive) {
            const dx = nx - hoverPt.x;
            const dy = ny - hoverPt.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < 0.75 && dSq > 0.001) {
              const push = (0.87 - Math.sqrt(dSq)) * 0.45;
              nx += (dx / Math.sqrt(dSq)) * push;
              ny += (dy / Math.sqrt(dSq)) * push;
            }
          }

          buffers.positions[i3] = nx;
          buffers.positions[i3 + 1] = ny;
          buffers.positions[i3 + 2] = nz;
          posAttr.setXYZ(i, nx, ny, nz);
        }
      } else {
        // 3. THREE ELECTRON ORBITAL RINGS (progress trails + orbital decay)
        const ringIdx = buffers.meta[i4 + 1];
        const ring = orbitalRings[ringIdx] || orbitalRings[0];
        const baseAngle = buffers.meta[i4 + 2];
        const radialOffset = buffers.meta[i4 + 3];

        if (!isPaused || supernovaFactor !== 0) {
          const theta = baseAngle + t * ring.speed * motionScale;
          const decayScale = Math.max(0.35, orbitalDecay + supernovaFactor * 1.3);
          const rx = (ring.rx + radialOffset) * decayScale;
          const ry = (ring.ry + radialOffset) * decayScale;
          const zWave = theme.isNebulaCloud ? Math.sin(theta * 3 + t) * 0.28 : Math.sin(theta * 2) * 0.06;

          vTemp.set(Math.cos(theta) * rx, Math.sin(theta) * ry, zWave);
          vTemp.applyEuler(ring.tilt);

          if (hoverActive) {
            const dx = vTemp.x - hoverPt.x;
            const dy = vTemp.y - hoverPt.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < 0.9 && dSq > 0.001) {
              const d = Math.sqrt(dSq);
              const scatter = (0.95 - d) * 0.55;
              vTemp.x += (dx / d) * scatter;
              vTemp.y += (dy / d) * scatter;
              vTemp.z += (Math.random() - 0.5) * scatter * 0.5;
            }
          }

          buffers.positions[i3] = vTemp.x;
          buffers.positions[i3 + 1] = vTemp.y;
          buffers.positions[i3 + 2] = vTemp.z;
          posAttr.setXYZ(i, vTemp.x, vTemp.y, vTemp.z);
        }

        // Electron trail fill: particles within current session progress glow at full intensity;
        // unreached trail segments stay dim until the session fills them in!
        const normalizedRingPos = baseAngle / (Math.PI * 2);
        const isTrailFilled = normalizedRingPos <= Math.max(0.08, progress);
        alphaAttr.setX(i, isTrailFilled ? 0.92 : 0.18);
      }
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    // Update the 3 Valence Electron Spheres & Orbital Wire Rings
    orbitalRings.forEach((ring, idx) => {
      const electronMesh = valenceElectronRefs.current[idx];
      const ringMesh = orbitRingRefs.current[idx];
      const decayScale = Math.max(0.35, orbitalDecay + supernovaFactor * 1.3);

      if (electronMesh && (!isPaused || supernovaFactor !== 0)) {
        const theta = t * ring.speed * 1.35 * motionScale + idx * 2.1;
        vTemp.set(
          Math.cos(theta) * ring.rx * decayScale,
          Math.sin(theta) * ring.ry * decayScale,
          0,
        );
        vTemp.applyEuler(ring.tilt);
        electronMesh.position.copy(vTemp);
      }

      if (ringMesh) {
        ringMesh.scale.set(decayScale, decayScale, decayScale);
      }
    });
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoverPointRef.current.copy(e.point);
    hoverActiveRef.current = true;
  };

  const handlePointerLeave = () => {
    hoverActiveRef.current = false;
    hoverPointRef.current.set(999, 999, 999);
  };

  const isPaused = !running && !alerting;
  const activeOrbitHex = isPaused ? '#64748b' : effectiveElectronColor;

  return (
    <group ref={rootGroupRef}>
      {/* Invisible interaction plane to capture 3D hover coordinates for particle scatter */}
      <mesh
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerLeave}
        visible={false}
      >
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Dark high-contrast nucleus core sphere so MM:SS digits are always ultra-readable */}
      <mesh>
        <sphereGeometry args={[1.48, 32, 32]} />
        <meshBasicMaterial
          color="#040711"
          transparent
          opacity={0.78}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle Nucleus Energy Glow */}
      <mesh>
        <sphereGeometry args={[1.32, 24, 24]} />
        <meshBasicMaterial
          color={isPaused ? '#475569' : alerting ? '#f59e0b' : theme.coreColor}
          transparent
          opacity={isPaused ? 0.04 : alerting ? 0.2 : 0.08 + progress * 0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3 Tilted Bohr Orbital Guide Rings that decay toward the nucleus as progress -> 1 */}
      {orbitalRings.map((ring, idx) => (
        <group key={idx} rotation={ring.tilt}>
          <mesh
            ref={(el) => {
              orbitRingRefs.current[idx] = el;
            }}
            scale={[1, ring.ry / ring.rx, 1]}
          >
            <torusGeometry args={[ring.rx, 0.012, 12, 96]} />
            <meshBasicMaterial
              color={activeOrbitHex}
              transparent
              opacity={isPaused ? 0.12 : 0.14 + progress * 0.18}
            />
          </mesh>
        </group>
      ))}

      {/* 3 Hero Valence Electrons colored by the selected Subject */}
      {orbitalRings.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            valenceElectronRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.095, 16, 16]} />
          <meshBasicMaterial color={activeOrbitHex} />
        </mesh>
      ))}

      {/* Single GPU Points Draw Call for all 4k–6k Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-customColor" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={shaderMatRef}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={PARTICLE_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ============================================================================
   MAIN EXPORTED COMPONENT
   ============================================================================ */
export interface AtomPomodoroSceneProps {
  timeText: string;
  phaseLabel?: string;
  progress: number;
  running: boolean;
  alerting: boolean;
  phase: PomodoroPhase;
  theme: QuantumTheme;
  subjectColor: string | null;
  subjectCode?: string | null;
  streakDays: number;
  userLevel: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function AtomPomodoroScene({
  timeText,
  progress,
  running,
  alerting,
  phase,
  theme,
  subjectColor,
  streakDays,
  userLevel,
  isFullscreen = false,
}: AtomPomodoroSceneProps) {
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const onVisChange = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  // Particle count grows with your study streak & level (4,000 base up to 6,500)
  const totalParticleBudget = useMemo(() => {
    if (theme.isLowPower) return 1250;
    const base = 4200;
    const streakBonus = Math.min(1500, streakDays * 180);
    const levelBonus = Math.min(800, (userLevel - 1) * 55);
    return base + streakBonus + levelBonus;
  }, [theme.isLowPower, streakDays, userLevel]);

  const isPaused = !running && !alerting;

  return (
    <div
      className={
        isFullscreen
          ? 'relative w-full h-full select-none overflow-hidden transition-all duration-700'
          : 'relative w-full h-[310px] sm:h-[340px] rounded-2xl overflow-hidden border border-line/70 shadow-inner select-none transition-all duration-700'
      }
      style={{
        background: isPaused
          ? 'radial-gradient(circle at 50% 50%, rgba(100, 116, 139, 0.14) 0%, rgba(15, 23, 42, 0.96) 65%, #06080f 100%)'
          : theme.bgGradient,
      }}
    >
      {/* Subtle Ambient Core Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45 transition-all duration-700"
        style={{
          background: isPaused
            ? 'radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.12) 0%, transparent 60%)'
            : alerting
              ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.35) 0%, transparent 62%)'
              : `radial-gradient(circle at 50% 50%, ${subjectColor || theme.coreColor}2e 0%, transparent 62%)`,
        }}
      />

      <Canvas
        camera={{ position: [0, 0, isFullscreen ? 5.6 : 6.0], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <QuantumAtomSystem
            timeText={timeText}
            progress={progress}
            running={running}
            alerting={alerting}
            phase={phase}
            theme={theme}
            subjectColor={subjectColor}
            totalParticleBudget={totalParticleBudget}
            isTabHidden={isTabHidden}
          />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3.8}
            maxDistance={8.8}
            rotateSpeed={0.65}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

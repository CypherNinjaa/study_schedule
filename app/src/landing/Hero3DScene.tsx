import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Hero3DSceneProps {
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: React.MutableRefObject<number>;
}

/**
 * Builds a centered, thin, Apple-machined rounded rectangle slab where X/Y corner
 * radius is independent of the thin Z thickness (avoiding RoundedBox depth <= 2*radius NaNs).
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

/**
 * Floating 3D Workspace Slab + Translucent Glass Domain Artifacts
 * (Inspired by Refokus + Summon's floating spatial depth paired with Apple hardware restraint).
 */
function WorkspaceRig({
  pointerRef,
  scrollProgressRef,
}: {
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const ringRef = useRef<THREE.Group | null>(null);
  const satLeftRef = useRef<THREE.Group | null>(null);
  const satRightRef = useRef<THREE.Group | null>(null);
  const satVaultRef = useRef<THREE.Group | null>(null);
  const smoothPointer = useRef({ x: 0, y: 0 });

  // Precision rounded slab geometries (disposed cleanly on unmount)
  const geos = useMemo(
    () => ({
      chassis: createRoundedPanelGeometry(4.52, 2.78, 0.1, 0.18, 0.018),
      bezel: createRoundedPanelGeometry(4.38, 2.66, 0.03, 0.13, 0.008),
      satLeftCard: createRoundedPanelGeometry(1.12, 1.12, 0.07, 0.18, 0.014),
      satLeftFace: createRoundedPanelGeometry(0.92, 0.92, 0.02, 0.12, 0.006),
      satRightCard: createRoundedPanelGeometry(1.3, 0.96, 0.07, 0.16, 0.014),
      bar1: createRoundedPanelGeometry(0.9, 0.15, 0.024, 0.05, 0.005),
      bar2: createRoundedPanelGeometry(0.74, 0.13, 0.024, 0.05, 0.005),
      bar3: createRoundedPanelGeometry(0.62, 0.13, 0.024, 0.05, 0.005),
      vaultCard: createRoundedPanelGeometry(1.26, 0.58, 0.065, 0.14, 0.012),
      vaultSpine: createRoundedPanelGeometry(0.08, 0.38, 0.022, 0.03, 0.004),
      vaultLine1: createRoundedPanelGeometry(0.58, 0.065, 0.016, 0.025, 0.003),
      vaultLine2: createRoundedPanelGeometry(0.42, 0.055, 0.016, 0.02, 0.003),
    }),
    [],
  );

  // Load real Study Schedule Dashboard screenshot as the crisp screen texture
  const screenTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/landing/screen-dashboard.webp', (loaded) => {
      loaded.needsUpdate = true;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      Object.values(geos).forEach((g) => g.dispose());
      screenTexture.dispose();
    };
  }, [geos, screenTexture]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    smoothPointer.current.x +=
      (pointerRef.current.x - smoothPointer.current.x) * (1 - Math.exp(-5 * dt));
    smoothPointer.current.y +=
      (pointerRef.current.y - smoothPointer.current.y) * (1 - Math.exp(-5 * dt));

    const sp = scrollProgressRef.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = -0.14 + smoothPointer.current.x * 0.16 + sp * 0.14;
      groupRef.current.rotation.x = 0.08 - smoothPointer.current.y * 0.09 + sp * 0.1;
      groupRef.current.position.y = 0.14 + Math.sin(t * 0.85) * 0.03 - sp * 0.14;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.25;
    }

    if (satLeftRef.current) {
      satLeftRef.current.position.y = 0.32 + Math.sin(t * 1.15) * 0.055;
    }
    if (satRightRef.current) {
      satRightRef.current.position.y = 0.44 + Math.sin(t * 1.0 + 1.4) * 0.05;
    }
    if (satVaultRef.current) {
      satVaultRef.current.position.y = -0.72 + Math.sin(t * 1.25 + 2.6) * 0.045;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Tilted Anodized Aluminum & Graphite Display Slab */}
      <group position={[0, 0.06, 0]}>
        {/* Outer precision brushed aluminum chassis */}
        <mesh geometry={geos.chassis}>
          <meshStandardMaterial color="#d9d5cd" metalness={0.58} roughness={0.28} />
        </mesh>
        {/* Inner deep obsidian bezel */}
        <mesh geometry={geos.bezel} position={[0, 0, 0.06]}>
          <meshStandardMaterial color="#121316" metalness={0.18} roughness={0.24} />
        </mesh>
        {/* Real Study Schedule Dashboard Screen Surface */}
        <mesh position={[0, 0, 0.088]}>
          <planeGeometry args={[4.16, 2.48]} />
          <meshBasicMaterial map={screenTexture} toneMapped={false} />
        </mesh>
      </group>

      {/* Floating Frosted Satellite 1 (Left): Precision Amber Pomodoro Focus Ring */}
      <group ref={satLeftRef} position={[-2.62, 0.34, 0.56]} rotation={[0.1, 0.32, -0.05]}>
        <mesh geometry={geos.satLeftCard}>
          <meshStandardMaterial
            color="#f7f4ee"
            roughness={0.24}
            metalness={0.08}
            transparent
            opacity={0.95}
          />
        </mesh>
        {/* Recessed dark dial face */}
        <mesh geometry={geos.satLeftFace} position={[0, 0, 0.048]}>
          <meshStandardMaterial color="#16181c" roughness={0.42} metalness={0.12} />
        </mesh>
        {/* Rotating Amber Focus Ring */}
        <group ref={ringRef} position={[0, 0, 0.074]}>
          <mesh>
            <torusGeometry args={[0.26, 0.022, 16, 48]} />
            <meshStandardMaterial color="#2c2f36" roughness={0.5} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.26, 0.032, 16, 48, Math.PI * 1.45]} />
            <meshStandardMaterial color="#e58b4a" metalness={0.4} roughness={0.26} />
          </mesh>
          <mesh position={[0.26, 0, 0]}>
            <sphereGeometry args={[0.048, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.45} roughness={0.22} />
          </mesh>
        </group>
      </group>

      {/* Floating Frosted Satellite 2 (Right): Structured Timetable / Day Block Card */}
      <group ref={satRightRef} position={[2.82, 0.44, 0.48]} rotation={[0.08, -0.3, 0.04]}>
        <mesh geometry={geos.satRightCard}>
          <meshStandardMaterial
            color="#f7f4ee"
            roughness={0.24}
            metalness={0.08}
            transparent
            opacity={0.95}
          />
        </mesh>
        {/* 3 Tactile Schedule Bars inside the card */}
        <mesh geometry={geos.bar1} position={[0, 0.21, 0.056]}>
          <meshStandardMaterial color="#d97706" roughness={0.35} metalness={0.18} />
        </mesh>
        <mesh geometry={geos.bar2} position={[-0.08, 0.0, 0.056]}>
          <meshStandardMaterial color="#0d9488" roughness={0.38} metalness={0.15} />
        </mesh>
        <mesh geometry={geos.bar3} position={[-0.14, -0.2, 0.056]}>
          <meshStandardMaterial color="#6d4ca0" roughness={0.38} metalness={0.15} />
        </mesh>
      </group>

      {/* Floating Satellite 3 (Bottom-Right): Tactile Local JSON / Book Vault */}
      <group ref={satVaultRef} position={[2.32, -0.72, 0.78]} rotation={[-0.12, -0.26, -0.04]}>
        <mesh geometry={geos.vaultCard}>
          <meshStandardMaterial color="#181a1f" roughness={0.36} metalness={0.25} />
        </mesh>
        {/* Amber spine accent strip */}
        <mesh geometry={geos.vaultSpine} position={[-0.46, 0, 0.048]}>
          <meshStandardMaterial color="#e58b4a" roughness={0.3} metalness={0.45} />
        </mesh>
        {/* Green live local-file dot */}
        <mesh position={[0.44, 0, 0.052]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#4abe78" emissive="#4abe78" emissiveIntensity={0.35} />
        </mesh>
        {/* Two clean file metadata bars */}
        <mesh geometry={geos.vaultLine1} position={[-0.02, 0.08, 0.048]}>
          <meshStandardMaterial color="#eceae4" roughness={0.5} />
        </mesh>
        <mesh geometry={geos.vaultLine2} position={[-0.1, -0.08, 0.048]}>
          <meshStandardMaterial color="#8a857b" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export default function Hero3DScene({ pointerRef, scrollProgressRef }: Hero3DSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.12, 5.95], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="h-full w-full"
    >
      <ambientLight intensity={0.95} color="#fffcf7" />
      <directionalLight position={[4.5, 6, 5]} intensity={1.6} color="#fff7eb" />
      <directionalLight position={[-5, 2.5, 3]} intensity={0.65} color="#dbeafe" />
      <pointLight position={[0, -2.5, 3]} intensity={0.85} color="#e58b4a" distance={10} />

      <WorkspaceRig pointerRef={pointerRef} scrollProgressRef={scrollProgressRef} />

      <ContactShadows
        frames={1}
        position={[0, -1.62, 0]}
        opacity={0.28}
        scale={11}
        blur={2.4}
        far={4}
        color="#141413"
      />
    </Canvas>
  );
}

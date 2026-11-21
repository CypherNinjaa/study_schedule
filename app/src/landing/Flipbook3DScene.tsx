import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Flipbook3DSceneProps {
  /** Scroll progress (0..1) across the 3D Flipbook dark chapter */
  chapterProgressRef: React.MutableRefObject<number>;
}

function createArchedPageGeometry(width: number, height: number, arch: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 20, 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const t = px / width;
    pos.setY(i, pos.getY(i) + Math.sin(t * Math.PI) * arch);
  }
  geo.computeVertexNormals();
  return geo;
}

function HardcoverBook({ chapterProgressRef }: Flipbook3DSceneProps) {
  const rootRef = useRef<THREE.Group | null>(null);
  const pageRefs = useRef<(THREE.Group | null)[]>([]);

  const pageGeos = useMemo(
    () => [
      createArchedPageGeometry(1.52, 2.02, 0.16),
      createArchedPageGeometry(1.52, 2.02, 0.2),
      createArchedPageGeometry(1.52, 2.02, 0.24),
      createArchedPageGeometry(1.52, 2.02, 0.18),
    ],
    [],
  );

  useEffect(() => {
    return () => {
      pageGeos.forEach((g) => g.dispose());
    };
  }, [pageGeos]);

  const baseAngles = [0.24, 0.68, 1.24, 1.88];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = chapterProgressRef.current;

    if (rootRef.current) {
      rootRef.current.rotation.y = -0.32 + p * 0.55 + Math.sin(t * 0.45) * 0.05;
      rootRef.current.rotation.x = 0.34 - p * 0.1;
      rootRef.current.position.y = -0.1 + Math.sin(t * 0.9) * 0.04;
    }

    pageRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      const turnOffset = p * (0.95 + i * 0.18) + Math.sin(t * 0.75 + i * 0.9) * 0.05;
      pivot.rotation.z = Math.min(Math.PI - 0.22, baseAngles[i] + turnOffset);
    });
  });

  return (
    <group ref={rootRef}>
      {/* Left & Right Graphite Hardcover Boards */}
      <RoundedBox args={[1.66, 0.065, 2.18]} radius={0.02} position={[-0.86, -0.08, 0]} rotation={[0, 0, -0.12]}>
        <meshStandardMaterial color="#1f2127" roughness={0.55} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[1.66, 0.065, 2.18]} radius={0.02} position={[0.86, -0.08, 0]} rotation={[0, 0, 0.12]}>
        <meshStandardMaterial color="#1f2127" roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* Luminous Warm Amber Spine Hinge */}
      <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2.2, 24]} />
        <meshStandardMaterial color="#e58b4a" roughness={0.28} metalness={0.68} />
      </mesh>

      {/* Left & Right Solid Page Blocks */}
      <mesh position={[-0.8, 0.02, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[1.54, 0.15, 2.04]} />
        <meshStandardMaterial color="#ece7dc" roughness={0.86} />
      </mesh>
      <mesh position={[0.8, 0.02, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[1.54, 0.15, 2.04]} />
        <meshStandardMaterial color="#ece7dc" roughness={0.86} />
      </mesh>

      {/* 4 Arched Turning Folio Pages with Printed Ink Rules */}
      {pageGeos.map((geo, idx) => (
        <group
          key={idx}
          ref={(el) => {
            pageRefs.current[idx] = el;
          }}
          position={[0, 0.11 + idx * 0.008, 0]}
          rotation={[0, 0, baseAngles[idx]]}
        >
          <mesh geometry={geo}>
            <meshStandardMaterial
              color={idx === 1 ? '#f7f3ea' : '#ebe5d8'}
              roughness={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Minimal printed chapter heading + lines on turning page */}
          <mesh position={[0.56, 0.16, -0.62]}>
            <boxGeometry args={[0.62, 0.004, 0.04]} />
            <meshBasicMaterial color="#e58b4a" />
          </mesh>
          {[0, 1, 2, 3, 4].map((row) => (
            <mesh key={row} position={[0.72, 0.16, -0.36 + row * 0.22]}>
              <boxGeometry args={[row === 4 ? 0.68 : 0.96, 0.003, 0.022]} />
              <meshBasicMaterial color="#8f897e" transparent opacity={0.55} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function Flipbook3DScene({ chapterProgressRef }: Flipbook3DSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0.1, 2.0, 4.9], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="h-full w-full"
    >
      <ambientLight intensity={0.62} color="#f5efe6" />
      <directionalLight position={[3.2, 5.5, 4]} intensity={1.75} color="#fff4e4" />
      <directionalLight position={[-4, 2, -2]} intensity={0.6} color="#93c5fd" />
      <pointLight position={[-1.8, 1.8, -1.4]} intensity={2.4} color="#e58b4a" distance={10} />

      <HardcoverBook chapterProgressRef={chapterProgressRef} />

      <ContactShadows
        frames={1}
        position={[0, -0.82, 0]}
        opacity={0.5}
        scale={7}
        blur={2.6}
        far={3}
        color="#000000"
      />
    </Canvas>
  );
}

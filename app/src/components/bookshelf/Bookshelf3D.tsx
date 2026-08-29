/**
 * Bookshelf3D — A single wooden bookshelf unit.
 *
 * Renders wooden planks with PBR materials and holds books on each row.
 */
import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Bookshelf3DProps {
  position: [number, number, number];
  width?: number;
  rows?: number;
  children?: React.ReactNode;
}

export function Bookshelf3D({
  position,
  width = 8,
  rows = 3,
  children,
}: Bookshelf3DProps) {
  const plankThickness = 0.08;
  const rowHeight = 1.8;
  const depth = 1.2;
  const sideWidth = 0.12;

  const woodMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#5c3a1e',
      roughness: 0.85,
      metalness: 0.02,
    });
  }, []);

  const darkWoodMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#3d2512',
      roughness: 0.9,
      metalness: 0.01,
    });
  }, []);

  const totalHeight = rows * rowHeight;

  return (
    <group position={position}>
      {/* Shelves (horizontal planks) */}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <RoundedBox
          key={`shelf-${i}`}
          args={[width, plankThickness, depth]}
          position={[0, i * rowHeight - totalHeight / 2, 0]}
          radius={0.01}
          smoothness={2}
          castShadow
          receiveShadow
        >
          <primitive object={woodMaterial} attach="material" />
        </RoundedBox>
      ))}

      {/* Left side panel */}
      <RoundedBox
        args={[sideWidth, totalHeight + plankThickness, depth]}
        position={[-(width / 2 + sideWidth / 2), totalHeight / 2 - totalHeight / 2, 0]}
        radius={0.01}
        smoothness={2}
        castShadow
      >
        <primitive object={darkWoodMaterial} attach="material" />
      </RoundedBox>

      {/* Right side panel */}
      <RoundedBox
        args={[sideWidth, totalHeight + plankThickness, depth]}
        position={[width / 2 + sideWidth / 2, totalHeight / 2 - totalHeight / 2, 0]}
        radius={0.01}
        smoothness={2}
        castShadow
      >
        <primitive object={darkWoodMaterial} attach="material" />
      </RoundedBox>

      {/* Back panel */}
      <mesh position={[0, totalHeight / 2 - totalHeight / 2, -depth / 2 - 0.02]} receiveShadow>
        <planeGeometry args={[width + sideWidth * 2, totalHeight + plankThickness]} />
        <meshStandardMaterial
          color="#2a1810"
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {children}
    </group>
  );
}

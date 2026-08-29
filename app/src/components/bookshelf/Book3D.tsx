/**
 * Book3D — A single 3D book on a shelf.
 *
 * Uses box geometry with cover texture, spine text, and interactive hover/click.
 * Book thickness varies based on page count. Shows reading progress on spine.
 */
import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Book } from '@/types/bookshelf';
import { getBookCover } from '@/services/bookshelfDb';

interface Book3DProps {
  book: Book;
  position: [number, number, number];
  onClick: () => void;
}

export function Book3D({ book, position, onClick }: Book3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);

  // Book dimensions based on page count
  const thickness = useMemo(() => {
    const base = 0.15;
    const extra = Math.min(book.totalPages / 1000, 1) * 0.35;
    return base + extra;
  }, [book.totalPages]);

  const height = 1.4;
  const width = 1.0;

  // Load cover texture
  useEffect(() => {
    if (!book.hasCover) return;
    let cancelled = false;

    getBookCover(book.id).then((blob) => {
      if (cancelled || !blob) return;
      const url = URL.createObjectURL(blob);
      const loader = new THREE.TextureLoader();
      loader.load(url, (tex) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        setCoverTexture(tex);
      });
    });

    return () => { cancelled = true; };
  }, [book.id, book.hasCover]);

  // Hover animation
  useFrame(() => {
    if (!meshRef.current) return;
    const target = hovered ? 0.2 : 0;
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, position[2] + target, 0.12);

    const targetRotY = hovered ? -0.08 : 0;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.1);
  });

  // Cover material
  const coverMaterial = useMemo(() => {
    if (coverTexture) {
      return new THREE.MeshStandardMaterial({
        map: coverTexture,
        roughness: 0.6,
        metalness: 0.05,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: book.coverColor || '#4f46e5',
      roughness: 0.7,
      metalness: 0.05,
    });
  }, [coverTexture, book.coverColor]);

  const spineMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: book.coverColor || '#4f46e5',
      roughness: 0.8,
      metalness: 0.02,
    });
  }, [book.coverColor]);

  const pageMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#f5f0e8',
      roughness: 0.9,
      metalness: 0,
    });
  }, []);

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Book body */}
      <RoundedBox
        args={[thickness, height, width]}
        radius={0.02}
        smoothness={2}
      >
        {/* Front cover */}
        <meshStandardMaterial attach="material-4" {...coverMaterial} />
        {/* Back cover */}
        <meshStandardMaterial attach="material-5" {...spineMaterial} />
        {/* Spine (left) */}
        <meshStandardMaterial attach="material-0" {...spineMaterial} />
        {/* Right edge (pages) */}
        <meshStandardMaterial attach="material-1" {...pageMaterial} />
        {/* Top */}
        <meshStandardMaterial attach="material-2" {...pageMaterial} />
        {/* Bottom */}
        <meshStandardMaterial attach="material-3" {...pageMaterial} />
      </RoundedBox>

      {/* Spine title text */}
      <Text
        position={[-thickness / 2 - 0.001, 0.1, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.09}
        maxWidth={0.85}
        textAlign="center"
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor={book.coverColor || '#000000'}
      >
        {book.title.length > 30 ? book.title.slice(0, 28) + '…' : book.title}
      </Text>

      {/* Reading progress bar on spine */}
      {book.progress > 0 && (
        <mesh
          position={[-thickness / 2 - 0.002, -(height / 2) + 0.05 + (book.progress * (height - 0.1)) / 2, 0]}
        >
          <planeGeometry args={[0.015, book.progress * (height - 0.1)]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}

      {/* Favorite indicator */}
      {book.favorite && (
        <Text
          position={[thickness / 2 + 0.001, height / 2 - 0.12, width / 2 - 0.12]}
          fontSize={0.12}
          anchorX="center"
          anchorY="middle"
        >
          ★
        </Text>
      )}

      {/* Hover glow */}
      {hovered && (
        <pointLight
          position={[0, 0, 0.6]}
          intensity={0.4}
          distance={2}
          color="#818cf8"
        />
      )}
    </group>
  );
}

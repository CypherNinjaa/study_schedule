/**
 * BookshelfScene — The main Three.js canvas for the 3D library.
 *
 * Sets up lighting, camera, controls, and renders the bookshelf + books.
 * Includes ambiance and post-processing for a warm library feel.
 */
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import type { Book } from '@/types/bookshelf';
import { Bookshelf3D } from './Bookshelf3D';
import { Book3D } from './Book3D';

interface BookshelfSceneProps {
  books: Book[];
  onBookClick: (bookId: string) => void;
  /** grouped books: each section has a label and book array */
  sections: { label: string; books: Book[] }[];
}

const BOOKS_PER_ROW = 10;
const BOOK_SPACING = 0.55;
const SHELF_WIDTH = 7;

function BookshelfContent({ sections, onBookClick }: BookshelfSceneProps) {
  const shelves = useMemo(() => {
    const result: {
      label: string;
      shelfY: number;
      books: { book: Book; position: [number, number, number] }[];
    }[] = [];

    let currentY = 0;

    for (const section of sections) {
      if (section.books.length === 0) continue;

      const rows = Math.ceil(section.books.length / BOOKS_PER_ROW);
      const rowHeight = 1.8;

      const booksWithPositions: { book: Book; position: [number, number, number] }[] = [];

      for (let i = 0; i < section.books.length; i++) {
        const row = Math.floor(i / BOOKS_PER_ROW);
        const col = i % BOOKS_PER_ROW;
        const x = (col - Math.min(section.books.length - row * BOOKS_PER_ROW, BOOKS_PER_ROW) / 2) * BOOK_SPACING + BOOK_SPACING / 2;
        const y = currentY - row * rowHeight + (rows - 1) * rowHeight / 2;

        booksWithPositions.push({
          book: section.books[i],
          position: [x, y, 0],
        });
      }

      result.push({
        label: section.label,
        shelfY: currentY,
        books: booksWithPositions,
      });

      currentY -= rows * rowHeight + 1.5;
    }

    return result;
  }, [sections]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#ffecd2" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#fff5e6"
      />
      <pointLight position={[-3, 4, 3]} intensity={0.3} color="#ffd699" />
      <pointLight position={[3, 2, 4]} intensity={0.2} color="#e6ccff" />

      {/* Environment for reflections */}
      <Environment preset="apartment" />

      {/* Floor shadows */}
      <ContactShadows
        position={[0, -4, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={10}
      />

      {/* Render each section as a shelf with books */}
      {shelves.map((shelf) => (
        <group key={shelf.label} position={[0, shelf.shelfY, 0]}>
          {/* Section label */}
          <Text
            position={[-SHELF_WIDTH / 2 - 0.5, 1.2, 1]}
            fontSize={0.18}
            color="#b8860b"
            anchorX="left"
            anchorY="middle"
          >
            {shelf.label}
          </Text>

          {/* The shelf */}
          <Bookshelf3D
            position={[0, 0, -0.3]}
            width={SHELF_WIDTH}
            rows={Math.ceil(shelf.books.length / BOOKS_PER_ROW)}
          >
            {/* Books on this shelf */}
            {shelf.books.map(({ book, position }) => (
              <Book3D
                key={book.id}
                book={book}
                position={position}
                onClick={() => onBookClick(book.id)}
              />
            ))}
          </Bookshelf3D>
        </group>
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        maxAzimuthAngle={Math.PI / 4}
        minAzimuthAngle={-Math.PI / 4}
        maxDistance={15}
        minDistance={3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function BookshelfScene({ books, onBookClick, sections }: BookshelfSceneProps) {
  return (
    <div className="relative h-full w-full min-h-[500px] rounded-2xl overflow-hidden">
      {/* Ambient background gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #1a1520 0%, #0d0a0e 40%, #141018 100%)',
        }}
      />

      <Canvas
        shadows
        camera={{ position: [0, 1, 8], fov: 45 }}
        className="relative z-10"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <BookshelfContent
            books={books}
            onBookClick={onBookClick}
            sections={sections}
          />
        </Suspense>
      </Canvas>

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

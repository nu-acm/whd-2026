import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import type { MotionValue } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';

const PHOTOS = [
  '/whd/timeline-1.webp',
  '/whd/timeline-2.webp',
  '/whd/timeline-3.webp',
  '/whd/gallery-teamwork.webp',
  '/whd/gallery-participants.webp',
  '/whd/gallery-awards.webp',
] as const;
const FRAMES = [
  { photo: 3, depth: 24 },
  { photo: 0, depth: -16 },
  { photo: 4, depth: 32 },
  { photo: 2, depth: -28 },
  { photo: 5, depth: 20 },
  { photo: 1, depth: -20 },
] as const;

function FloatingPhoto({
  frame,
  index,
  progress,
  pointerX,
  pointerY,
  reduced,
  onOpen,
}: {
  frame: (typeof FRAMES)[number];
  index: number;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  reduced: boolean;
  onOpen: (photo: number) => void;
}) {
  const { t } = useTranslation();
  const x = useTransform(pointerX, (value) => value * frame.depth * 0.45);
  const y = useTransform(
    () => (progress.get() - 0.5) * frame.depth * 2 + pointerY.get() * frame.depth * 0.45,
  );
  return (
    <motion.button
      type="button"
      className={`gallery-frame gallery-frame-${index + 1}`}
      style={reduced ? undefined : { x, y }}
      onClick={() => onOpen(frame.photo)}
      aria-label={t('gallery.openPhoto', { index: frame.photo + 1 })}
    >
      <img
        src={PHOTOS[frame.photo]}
        alt=""
        width={900}
        height={680}
        loading="lazy"
        decoding="async"
      />
    </motion.button>
  );
}

export default function Gallery() {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start end', 'end start'] });
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointerX = useSpring(rawX, { stiffness: 100, damping: 25 });
  const pointerY = useSpring(rawY, { stiffness: 100, damping: 25 });
  const isOpen = selected !== null;

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    rawY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }
  function step(direction: number) {
    setSelected((current) =>
      current === null ? null : (current + direction + PHOTOS.length) % PHOTOS.length,
    );
  }
  return (
    <section id="gallery" className="gallery-section" aria-labelledby="gallery-title">
      <div
        ref={stage}
        className="gallery-stage"
        onPointerMove={move}
        onPointerLeave={() => {
          rawX.set(0);
          rawY.set(0);
        }}
      >
        <div className="gallery-center">
          <p className="landing-eyebrow">{t('gallery.kicker')}</p>
          <h2 id="gallery-title" className="landing-heading">
            {t('gallery.title')}
          </h2>
          <button type="button" className="gallery-open" onClick={() => setSelected(0)}>
            {t('gallery.viewPhotos')}
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
        {FRAMES.map((frame, index) => (
          <FloatingPhoto
            key={index}
            frame={frame}
            index={index}
            progress={scrollYProgress}
            pointerX={pointerX}
            pointerY={pointerY}
            reduced={!!reduced}
            onOpen={setSelected}
          />
        ))}
      </div>
      <dialog
        ref={dialog}
        className="gallery-dialog"
        aria-label={t('gallery.title')}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
          }
        }}
      >
        {selected !== null && (
          <div className="gallery-viewer">
            <button
              type="button"
              className="gallery-close"
              aria-label={t('gallery.close')}
              onClick={() => setSelected(null)}
            >
              <X aria-hidden="true" />
            </button>
            <img
              src={PHOTOS[selected]}
              alt={t('gallery.imageAlt', { index: selected + 1 })}
              width={900}
              height={680}
            />
            <div className="gallery-controls">
              <button type="button" aria-label={t('gallery.previous')} onClick={() => step(-1)}>
                <ArrowLeft aria-hidden="true" />
              </button>
              <p aria-live="polite">
                {selected + 1} / {PHOTOS.length}
              </p>
              <button type="button" aria-label={t('gallery.next')} onClick={() => step(1)}>
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

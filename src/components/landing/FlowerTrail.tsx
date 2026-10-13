import { useEffect, useRef } from 'react';

const FLOWERS = [
  '/whd/trail-flower-pink.webp',
  '/whd/trail-flower-purple.webp',
  '/whd/trail-flower-white.webp',
];
const MAX_FLOWERS = 16;

/** Decorative particles live outside React's render cycle. */
export default function FlowerTrail() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const finePointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = new Map<HTMLImageElement, Animation>();
    // Reuse a fixed pool instead of allocating and removing nodes during movement.
    const flowers = Array.from({ length: MAX_FLOWERS }, (_, index) => {
      const flower = new Image();
      flower.src = FLOWERS[index % FLOWERS.length];
      flower.alt = '';
      flower.draggable = false;
      layer.appendChild(flower);
      return flower;
    });
    let disposed = false;
    let ready = false;
    void Promise.allSettled(flowers.map((flower) => flower.decode())).then(() => {
      ready = !disposed;
    });
    let previous: { x: number; y: number; time: number } | null = null;
    let flowerIndex = 0;

    const release = (flower: HTMLImageElement) => {
      particles.get(flower)?.cancel();
      particles.delete(flower);
    };

    const clear = () => {
      particles.forEach((_, flower) => release(flower));
      previous = null;
    };

    const move = (event: PointerEvent) => {
      if (!ready || event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches)
        return;
      const now = performance.now();
      if (
        previous &&
        (now - previous.time < 60 ||
          Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 20)
      ) {
        return;
      }
      previous = { x: event.clientX, y: event.clientY, time: now };

      const flower = flowers[flowerIndex++ % flowers.length];
      release(flower);
      if (!flower.complete || flower.naturalWidth === 0) return;
      const size = 20 + Math.random() * 30;
      const rotation = Math.random() * 240 - 120;
      const driftX = Math.random() * 44 - 22;
      const driftY = 18 + Math.random() * 30;
      const spin = Math.random() * 100 - 50;
      Object.assign(flower.style, {
        width: `${size}px`,
        left: `${event.clientX}px`,
        top: `${event.clientY}px`,
      });
      const animation = flower.animate(
        [
          { opacity: 0, transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(.45)` },
          {
            opacity: 0.95,
            transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(1)`,
            offset: 0.12,
          },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) rotate(${rotation + spin}deg) scale(.15)`,
          },
        ],
        { duration: 800 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' },
      );
      particles.set(flower, animation);
      animation.onfinish = () => release(flower);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', clear);
    window.addEventListener('scroll', clear, { passive: true });
    document.addEventListener('visibilitychange', clear);
    finePointer.addEventListener('change', clear);
    reducedMotion.addEventListener('change', clear);

    return () => {
      disposed = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', clear);
      window.removeEventListener('scroll', clear);
      document.removeEventListener('visibilitychange', clear);
      finePointer.removeEventListener('change', clear);
      reducedMotion.removeEventListener('change', clear);
      clear();
      flowers.forEach((flower) => flower.remove());
    };
  }, []);

  return <div ref={layerRef} className="flower-trail" aria-hidden="true" />;
}

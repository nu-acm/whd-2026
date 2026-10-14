// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import FlowerTrail from './FlowerTrail';

const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
const originalAnimations = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getAnimations');
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
  if (originalAnimations)
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', originalAnimations);
  else Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
});

async function setup(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(100);
  const cancel = vi.fn();
  const animation = { cancel, onfinish: null } as unknown as Animation;
  const animations = vi.fn(() => [animation]);
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: animations,
  });
  const view = render(<FlowerTrail />);
  await act(async () => {
    await Promise.resolve();
  });
  return { ...view, cancel };
}

function move(pointerType: string) {
  const event = new MouseEvent('pointermove', { clientX: 120, clientY: 240 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(window, event);
}

it('positions a pooled flower through CSS properties and clears it on scroll', async () => {
  const { container, cancel } = await setup(false);
  expect(container.querySelectorAll('img')).toHaveLength(16);
  move('mouse');
  const flower = container.querySelector('img[data-active]') as HTMLImageElement;
  expect(flower).toBeTruthy();
  expect(flower.style.getPropertyValue('--flower-x')).toBe('120px');
  expect(flower.style.getPropertyValue('--flower-y')).toBe('240px');
  expect(flower.style.left).toBe('');
  expect(flower.style.width).toBe('');
  fireEvent.scroll(window);
  expect(container.querySelector('img[data-active]')).toBeNull();
  expect(cancel).toHaveBeenCalledOnce();
});

it('keeps the trail inactive for reduced motion and touch input', async () => {
  const first = await setup(true);
  move('mouse');
  expect(first.container.querySelector('img[data-active]')).toBeNull();
  first.unmount();
  const second = await setup(false);
  move('touch');
  expect(second.container.querySelector('img[data-active]')).toBeNull();
});

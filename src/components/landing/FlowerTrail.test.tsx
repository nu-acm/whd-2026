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

async function setup(reduced: boolean, fine = true) {
  const reducedMotion = Object.assign(new EventTarget(), { matches: reduced });
  const finePointer = Object.assign(new EventTarget(), { matches: fine });
  vi.stubGlobal('matchMedia', (query: string) =>
    query.includes('prefers-reduced-motion') ? reducedMotion : finePointer,
  );
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(100);
  const cancel = vi.fn();
  const animation = { cancel, onfinish: null } as unknown as Animation;
  const animations = vi.fn(() => [animation]);
  const decode = vi.fn(() => Promise.resolve());
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: decode,
  });
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: animations,
  });
  const view = render(<FlowerTrail />);
  await act(async () => {
    await Promise.resolve();
  });
  return { ...view, cancel, decode, reducedMotion, finePointer };
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
  expect(flower.parentElement?.style.getPropertyValue('--flower-x')).toBe('120px');
  expect(flower.parentElement?.style.getPropertyValue('--flower-y')).toBe('240px');
  expect(flower.style.left).toBe('');
  expect(flower.style.width).toBe('');
  fireEvent.scroll(window);
  expect(container.querySelector('img[data-active]')).toBeNull();
  expect(cancel).toHaveBeenCalledOnce();
});

it('keeps the trail inactive for reduced motion and touch input', async () => {
  const first = await setup(true);
  expect(first.container.querySelectorAll('img')).toHaveLength(0);
  expect(first.decode).not.toHaveBeenCalled();
  move('mouse');
  expect(first.container.querySelector('img[data-active]')).toBeNull();
  first.unmount();
  const second = await setup(false);
  move('touch');
  expect(second.container.querySelector('img[data-active]')).toBeNull();
});

it('does not create or decode particles without a fine pointer', async () => {
  const { container, decode } = await setup(false, false);
  move('mouse');
  expect(container.querySelectorAll('img')).toHaveLength(0);
  expect(decode).not.toHaveBeenCalled();
});

it('releases and recreates the pool when motion or pointer preferences change', async () => {
  const { container, cancel, reducedMotion, finePointer } = await setup(false);
  move('mouse');
  expect(container.querySelector('img[data-active]')).toBeTruthy();

  reducedMotion.matches = true;
  reducedMotion.dispatchEvent(new Event('change'));
  expect(container.querySelectorAll('img')).toHaveLength(0);
  expect(cancel).toHaveBeenCalledOnce();

  reducedMotion.matches = false;
  reducedMotion.dispatchEvent(new Event('change'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(container.querySelectorAll('img')).toHaveLength(16);
  move('mouse');
  expect(container.querySelector('img[data-active]')).toBeTruthy();

  finePointer.matches = false;
  finePointer.dispatchEvent(new Event('change'));
  expect(container.querySelectorAll('img')).toHaveLength(0);

  finePointer.matches = true;
  finePointer.dispatchEvent(new Event('change'));
  await act(async () => {
    await Promise.resolve();
  });
  move('mouse');
  expect(container.querySelector('img[data-active]')).toBeTruthy();
});

it('ignores decoding from a discarded pool', async () => {
  const { container, decode, reducedMotion } = await setup(true);
  let finishOldDecode: () => void = () => {};
  let finishNewDecode: () => void = () => {};
  const oldDecode = new Promise<void>((resolve) => {
    finishOldDecode = resolve;
  });
  const newDecode = new Promise<void>((resolve) => {
    finishNewDecode = resolve;
  });
  decode.mockReturnValue(oldDecode);
  reducedMotion.matches = false;
  reducedMotion.dispatchEvent(new Event('change'));
  reducedMotion.matches = true;
  reducedMotion.dispatchEvent(new Event('change'));
  decode.mockReturnValue(newDecode);
  reducedMotion.matches = false;
  reducedMotion.dispatchEvent(new Event('change'));

  await act(async () => {
    finishOldDecode();
  });
  move('mouse');
  expect(container.querySelector('img[data-active]')).toBeNull();

  await act(async () => {
    finishNewDecode();
  });
  move('mouse');
  expect(container.querySelector('img[data-active]')).toBeTruthy();
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import Gallery from './Gallery';

const nativeFocus = Reflect.get(HTMLElement.prototype, 'focus') as (
  this: HTMLElement,
  options?: FocusOptions,
) => void;
beforeEach(() => {
  // jsdom does not read the preventScroll option used by Base UI's feature probe.
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    if (options) void options.preventScroll;
    nativeFocus.call(this, options);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the landing gallery', () => {
  it('opens the selected photograph, crossfades, and wraps keyboard and button navigation', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Gallery />);
    await user.click(screen.getByRole('button', { name: 'Open photo 4' }));
    const dialog = await screen.findByRole('dialog', { name: 'This is WHD' });
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe('/whd/gallery-teamwork.webp');
    await user.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('5 / 6')).toBeTruthy();
    expect(within(dialog).getAllByRole('img')).toHaveLength(2);
    await waitFor(() => expect(within(dialog).getAllByRole('img')).toHaveLength(1));
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe(
      '/whd/gallery-participants.webp',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Next photo' }));
    expect(within(dialog).getByText('6 / 6')).toBeTruthy();
    await user.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('1 / 6')).toBeTruthy();
    await user.keyboard('{ArrowLeft}');
    expect(within(dialog).getByText('6 / 6')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Previous photo' }));
    expect(within(dialog).getByText('5 / 6')).toBeTruthy();
  });

  it.each(['Escape', 'backdrop', 'close'])(
    'dismisses with %s and restores the actual opener',
    async (method) => {
      const user = userEvent.setup();
      renderWithI18n(<Gallery />);
      const opener = screen.getByRole('button', { name: 'View photos' });
      await user.click(opener);
      const dialog = await screen.findByRole('dialog', { name: 'This is WHD' });
      expect(within(dialog).getByText('1 / 6')).toBeTruthy();
      if (method === 'Escape') await user.keyboard('{Escape}');
      else if (method === 'backdrop')
        await user.click(document.querySelector('[data-slot="dialog-overlay"]')!);
      else await user.click(within(dialog).getByRole('button', { name: 'Close gallery' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(opener));
      await user.click(opener);
      expect(await screen.findByRole('dialog')).toBeTruthy();
      expect(screen.getByText('1 / 6')).toBeTruthy();
    },
  );
});

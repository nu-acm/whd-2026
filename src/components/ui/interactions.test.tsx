// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';

const nativeFocus = Reflect.get(HTMLElement.prototype, 'focus') as (
  this: HTMLElement,
  options?: FocusOptions,
) => void;
beforeEach(() => {
  // Base UI probes preventScroll support on backdrop dismissal; jsdom does not read it.
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

function Confirmation({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mark absent</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Mark absent?"
        description="Update attendance for this participant."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
      />
    </>
  );
}
describe('Base UI interactions', () => {
  it('supports keyboard activation, collapse, and one open accordion item', async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>First question</AccordionTrigger>
          <AccordionContent>First answer</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Second question</AccordionTrigger>
          <AccordionContent>Second answer</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First question' }));
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'First question' }).getAttribute('aria-expanded'),
    ).toBe('true');
    await user.tab();
    await user.keyboard(' ');
    expect(
      screen.getByRole('button', { name: 'Second question' }).getAttribute('aria-expanded'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'First question' }).getAttribute('aria-expanded'),
    ).toBe('false');
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Second question' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
  it('focuses Cancel, ignores the backdrop, cancels with Escape, and restores focus', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Confirmation onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: 'Mark absent' });
    await user.click(trigger);
    await screen.findByRole('alertdialog', { name: 'Mark absent?' });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })),
    );
    await user.click(document.querySelector('[data-slot="alert-dialog-overlay"]')!);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });
});

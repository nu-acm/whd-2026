// @vitest-environment jsdom
import { expect, it } from 'vite-plus/test';
import { act, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { fireEvent, within } from '@testing-library/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Button } from './button';
import { FormField } from './form-field';
import { Input } from './input';
function App() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FormField label="Email">{(props) => <InputControl {...props} />}</FormField>
      <Accordion defaultValue={['one']}>
        <AccordionItem value="one">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Details</DialogTitle>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
const InputControl = (props: {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}) => <Input {...props} defaultValue="participant@example.com" />;
it('hydrates controlled components and opens portals without recoverable errors on React 19.3', async () => {
  const errors: unknown[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  container.innerHTML = renderToString(<App />);
  let root!: ReturnType<typeof hydrateRoot>;
  try {
    await act(async () => {
      root = hydrateRoot(container, <App />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(within(container).getByRole('textbox', { name: 'Email' })).toHaveProperty(
      'value',
      'participant@example.com',
    );
    expect(
      within(container).getByRole('button', { name: 'Question' }).getAttribute('aria-expanded'),
    ).toBe('true');
    await act(async () => fireEvent.click(within(container).getByRole('button', { name: 'Open' })));
    expect(within(document.body).getByRole('dialog', { name: 'Details' })).toBeTruthy();
    await act(async () =>
      fireEvent.click(within(document.body).getByRole('button', { name: 'Close' })),
    );
    expect(errors).toEqual([]);
  } finally {
    if (root) await act(async () => root.unmount());
    container.remove();
  }
});

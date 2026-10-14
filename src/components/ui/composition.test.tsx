// @vitest-environment jsdom
import { afterEach, expect, it } from 'vite-plus/test';
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card';
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from './field';
import { Input } from './input';

afterEach(cleanup);

function ContactCard() {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && !value.includes('@');
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>Enter an email for registration.</CardDescription>
        <CardAction>
          <a href="/faq" className={buttonVariants({ variant: 'link', size: 'xs' })}>
            Help
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldSet>
          <FieldLegend variant="label">Registration email</FieldLegend>
          <FieldGroup>
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? 'email-hint email-error' : 'email-hint'}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <FieldDescription id="email-hint">We send a verification code here.</FieldDescription>
              <FieldError
                id="email-error"
                errors={
                  invalid
                    ? [
                        { message: 'Enter a valid email.' },
                        undefined,
                        { message: 'Enter a valid email.' },
                      ]
                    : []
                }
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </CardContent>
      <CardFooter>
        <Button variant="default" size="default" onClick={() => setSubmitted(true)}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}

it('supports standard shadcn composition with linked labels, descriptions, and deduplicated errors', async () => {
  const user = userEvent.setup();
  render(<ContactCard />);
  const input = screen.getByRole('textbox', { name: 'Email' });
  expect(screen.getByRole('group', { name: 'Registration email' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('/faq');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(within(screen.getByRole('alert')).getAllByText('Enter a valid email.')).toHaveLength(1);
  expect(input.getAttribute('aria-describedby')).toBe('email-hint email-error');
  await user.type(input, 'participant@example.test');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(input.getAttribute('aria-invalid')).toBeNull();
});

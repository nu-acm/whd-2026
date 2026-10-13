import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18n } from '@/i18n';

/** Render real translations with a fresh instance for each test. */
export function renderWithI18n(element: ReactElement) {
  const i18n = createI18n();
  return { ...render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>), i18n };
}

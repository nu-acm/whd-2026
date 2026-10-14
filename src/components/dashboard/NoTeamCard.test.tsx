// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderWithI18n } from '@/test/render';
import { AI_COOLDOWN_MS } from '@/lib/ai';
import { NoTeamCard } from './NoTeamCard';

vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(onGenerate: () => Promise<string>) {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  const onJoin = vi.fn().mockResolvedValue(undefined);
  renderWithI18n(
    <NoTeamCard registrationOpen onCreate={onCreate} onJoin={onJoin} onGenerate={onGenerate} />,
  );
  return { onCreate, onJoin };
}

describe('team name generation', () => {
  it('allows cancellation and keeps a late suggestion from overwriting an edited name', async () => {
    vi.useFakeTimers();
    let finish!: (name: string) => void;
    const onGenerate = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const { onCreate } = setup(onGenerate);
    const name = screen.getByRole('textbox', { name: 'Team name' });
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a team name' }));
    expect(name).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(name).toHaveProperty('disabled', false);
    fireEvent.change(name, { target: { value: 'Chosen name' } });
    await act(async () => {
      finish('Late suggestion');
    });
    expect(name).toHaveProperty('value', 'Chosen name');
    expect(onGenerate).toHaveBeenCalledOnce();
    await act(async () => {
      vi.advanceTimersByTime(3250);
    });
    expect(screen.getByRole('button', { name: 'Suggest a team name' })).toHaveProperty(
      'disabled',
      false,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create a team' }));
    });
    expect(onCreate).toHaveBeenCalledWith('Chosen name');
  });

  it('uses a suggestion and prevents another generation until the cooldown expires', async () => {
    vi.useFakeTimers();
    const onGenerate = vi.fn().mockResolvedValue('Suggested name');
    setup(onGenerate);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Suggest a team name' }));
    });
    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveProperty(
      'value',
      'Suggested name',
    );
    expect(screen.getByRole('button', { name: /Try again in/ })).toHaveProperty('disabled', true);
    await act(async () => {
      vi.advanceTimersByTime(AI_COOLDOWN_MS + 250);
    });
    expect(screen.getByRole('button', { name: 'Suggest a team name' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});

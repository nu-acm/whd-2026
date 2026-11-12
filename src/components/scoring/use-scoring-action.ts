import { useState, useSyncExternalStore } from 'react';
import { useRouter } from '@tanstack/react-router';

const noopSubscribe = () => () => {};

export function useScoringAction() {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ key: string; error: boolean } | null>(null);
  const run = async (action: () => Promise<unknown>, message = 'scoring.saved') => {
    setPending(true);
    setFeedback(null);
    try {
      await action();
      await router.invalidate();
      setFeedback({ key: message, error: false });
      return true;
    } catch (error) {
      const key =
        error instanceof Error && error.message.startsWith('scoring.errors.')
          ? error.message
          : 'scoring.errors.failed';
      setFeedback({ key, error: true });
      return false;
    } finally {
      setPending(false);
    }
  };
  return { pending: pending || !hydrated, feedback, run };
}

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import { CvCard } from './CvCard';
import { CV_MAX_BYTES } from '@/lib/cv';

vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(props = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  const onDone = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const result = renderWithI18n(
    <CvCard hasCv={false} registrationOpen onDone={onDone} onError={onError} {...props} />,
  );
  return { ...result, fetchMock, onDone, onError };
}
const pdf = () => new File(['%PDF-1.7 test'], 'cv.pdf', { type: 'application/pdf' });
function drop(files: File[]) {
  fireEvent.drop(screen.getByRole('group', { name: 'Drop your CV here' }), {
    dataTransfer: { files, types: ['Files'] },
  });
}

describe('CV file drop', () => {
  it('uploads a dropped PDF once and blocks another drop while pending', async () => {
    const { fetchMock, onDone } = setup();
    let finish!: (value: { ok: boolean }) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const file = pdf();
    drop([file]);
    expect(screen.getByRole('button', { name: 'Uploading…' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('status').textContent).toContain('cv.pdf');
    drop([pdf()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cv');
    expect(init.method).toBe('POST');
    expect(init.body.get('file')).toEqual(file);
    finish({ ok: true });
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    await screen.findByRole('button', { name: 'Choose file' });
  });

  it('rejects non-PDF, oversized and multiple files without a request', () => {
    const { fetchMock, onError } = setup();
    drop([new File(['image'], 'photo.png', { type: 'image/png' })]);
    expect(screen.getByRole('status').textContent).toContain('PDF');
    const large = pdf();
    Object.defineProperty(large, 'size', { value: CV_MAX_BYTES + 1 });
    drop([large]);
    expect(screen.getByRole('status').textContent).toContain('5');
    drop([pdf(), pdf()]);
    expect(screen.getByRole('status').textContent).toContain('one PDF');
    expect(onError).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows retrying the same file through the picker after a failed request', async () => {
    const user = userEvent.setup();
    const { container, fetchMock, onDone } = setup();
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = pdf();
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('try again'));
    expect(onDone).not.toHaveBeenCalled();
    await user.upload(input, file);
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('keeps replacement and confirmed deletion, and locks both after registration', async () => {
    const user = userEvent.setup();
    const { fetchMock, onDone, onError, rerender } = setup({ hasCv: true });
    expect(screen.getByRole('button', { name: 'Replace' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /click again/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/cv', { method: 'DELETE' }));
    rerender(<CvCard hasCv registrationOpen={false} onDone={onDone} onError={onError} />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

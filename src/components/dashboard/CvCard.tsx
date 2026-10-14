import { FileText, CircleCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload-2';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { CV_ERRORS, CV_MAX_BYTES, CV_MAX_MB } from '@/lib/cv';

type Pending = 'upload' | 'delete' | null;

/** Calls /api/cv; resolves on success, throws an i18n key on failure. */
async function requestCv(init: RequestInit) {
  let res: Response;
  try {
    res = await fetch('/api/cv', init);
  } catch {
    throw new Error(CV_ERRORS.failed);
  }
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error ?? CV_ERRORS.failed);
}

/**
 * Optional PDF CV, stored in the organisers' Google Drive. The participant can
 * replace or delete it until registration closes; organisers open it from /admin.
 */
export function CvCard({
  hasCv,
  registrationOpen,
  onDone,
  onError,
}: {
  hasCv: boolean;
  registrationOpen: boolean;
  /** Refresh the page data and show `message`. */
  onDone: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const busyRef = useRef(false);
  const [uploadName, setUploadName] = useState('');
  const [error, setError] = useState('');
  const reportError = (message: string) => {
    setError(message);
    onError(message);
  };
  const [pending, setPending] = useState<Pending>(null);

  const run = async (key: Exclude<Pending, null>, action: () => Promise<void>, done: string) => {
    if (busyRef.current || !registrationOpen) return;
    busyRef.current = true;
    setError('');
    setPending(key);
    try {
      await action();
      await onDone(done);
    } catch (err) {
      // Error messages are i18n keys from /api/cv; t() passes anything else through.
      const key = err instanceof Error ? err.message : CV_ERRORS.failed;
      reportError(t(key, { mb: CV_MAX_MB }));
    } finally {
      busyRef.current = false;
      setPending(null);
      setUploadName('');
    }
  };

  const upload = (files: File[]) => {
    if (busyRef.current || !registrationOpen) return;
    if (files.length !== 1) return reportError(t('cv.errorSingleFile'));
    const file = files[0];
    // Checked again on the server; this just saves a pointless upload.
    if (file.size > CV_MAX_BYTES) return reportError(t(CV_ERRORS.tooLarge, { mb: CV_MAX_MB }));
    if (
      (file.type && file.type !== 'application/pdf') ||
      (!file.type && !/\.pdf$/i.test(file.name))
    ) {
      return reportError(t(CV_ERRORS.notPdf));
    }
    setUploadName(file.name);
    const body = new FormData();
    body.append('file', file);
    return run('upload', () => requestCv({ method: 'POST', body }), t('cv.feedbackUploaded'));
  };

  return (
    <Card variant="cv">
      <CardHeader variant="cv">
        <FileText className="account-section-icon" aria-hidden="true" />
        <div className="account-card-heading">
          <CardTitle variant="account">{t('cv.title')}</CardTitle>
          <CardAction>
            <Badge variant="status" complete={hasCv}>
              {hasCv && <CircleCheck size={14} aria-hidden="true" />}
              {hasCv ? t('cv.uploaded') : t('cv.none')}
            </Badge>
          </CardAction>
        </div>

        <CardDescription variant="account">
          {registrationOpen ? t('cv.hint', { mb: CV_MAX_MB }) : t('cv.locked')}
        </CardDescription>
      </CardHeader>

      {registrationOpen && (
        <CardContent variant="cv">
          <div className="account-cv-upload">
            <FileUpload
              accept="application/pdf,.pdf"
              onFilesAdded={upload}
              disabled={pending !== null}
              uploading={pending === 'upload'}
              fileName={uploadName}
              title={t('cv.dropTitle')}
              hint={t('cv.dropHint', { mb: CV_MAX_MB })}
              buttonLabel={hasCv ? t('cv.replace') : t('cv.chooseFile')}
              uploadingLabel={t('cv.uploading')}
              error={error}
            />
            {hasCv && (
              <ConfirmButton
                label={t('cv.delete')}
                confirmLabel={t('cv.deleteConfirm')}
                loading={pending === 'delete'}
                loadingLabel={t('common.loading')}
                disabled={pending !== null}
                onConfirm={() =>
                  run('delete', () => requestCv({ method: 'DELETE' }), t('cv.feedbackDeleted'))
                }
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

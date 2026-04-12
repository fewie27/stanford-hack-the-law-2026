import './global.css';
import { useCallback, useRef, useState } from 'react';

import {
  captureEvidenceUrl,
  fetchEvidenceImage,
  fetchEvidenceMetadata,
  normalizeEvidenceUrl,
  uploadEvidenceImage,
  type EvidenceMetadata,
} from './evidenceApi';

type FormData = {
  url: string;
};

type View = 'home' | 'create' | 'access';

const CREATE_STEP_LABELS = ['Screenshot', 'Analysis', 'Review'] as const;

/** Shared shell + panels — matches home (gradient, glass, subtle ring). */
const PAGE_BG =
  'min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100';
const PANEL =
  'rounded-2xl border border-slate-700/80 bg-slate-900/60 shadow-xl shadow-slate-950/50 backdrop-blur-sm ring-1 ring-white/5';
const PANEL_INNER = 'rounded-xl border border-slate-600/50 bg-slate-950/40';

type LawyerProfile = {
  name: string;
  focus: string;
  hint: string;
  initial: string;
  accent: string;
  avatar: string;
};

const LAWYERS: LawyerProfile[] = [
  {
    name: 'Sarah Martinez, Esq.',
    focus: 'Cybercrime & digital rights',
    hint: 'Warm, clear guidance when content was shared or altered online.',
    initial: 'SM',
    accent: 'border-l-amber-500/70',
    avatar: 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25',
  },
  {
    name: 'James Chen, Esq.',
    focus: 'Media law & defamation',
    hint: 'Helps you understand options before anything is filed.',
    initial: 'JC',
    accent: 'border-l-sky-500/70',
    avatar: 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/25',
  },
  {
    name: 'Rachel Thompson, Esq.',
    focus: 'AI & deepfake litigation',
    hint: 'Experience with synthetic media and authenticity questions.',
    initial: 'RT',
    accent: 'border-l-violet-500/70',
    avatar: 'bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/25',
  },
];

function VaultLockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14.5v1.5M8 10V8a4 4 0 118 0v2m-9 9h10a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2z"
        className="stroke-current"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LawyerCards({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="space-y-3">
      {LAWYERS.map((L, i) => (
        <div
          key={L.name}
          className={`${PANEL} flex gap-4 border-l-4 p-4 text-left transition hover:bg-slate-900/75 ${L.accent}`}
        >
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${L.avatar}`}
            aria-hidden
          >
            {L.initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{L.name}</p>
            <p className="text-sm text-slate-400">{L.focus}</p>
            <p className="mt-2 text-sm leading-snug text-slate-300">{L.hint}</p>
            <p className="mt-2 text-xs font-medium text-emerald-400/90">
              Free initial consultation
            </p>
            <button
              type="button"
              id={`${idPrefix}-lawyer-${i}`}
              className="mt-3 text-sm font-medium text-sky-400/95 underline-offset-4 hover:text-sky-300 hover:underline"
            >
              Request intro
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCapturedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return (
      d.toLocaleString(undefined, { timeZone: 'UTC' }) + ' UTC'
    );
  } catch {
    return iso;
  }
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    url: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  const [evidenceCode, setEvidenceCode] = useState<string | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<EvidenceMetadata | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessMetadata, setAccessMetadata] = useState<EvidenceMetadata | null>(null);
  const [accessImageUrl, setAccessImageUrl] = useState<string | null>(null);

  const revokePreviewUrl = useCallback(() => {
    setPreviewImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const revokeAccessUrl = useCallback(() => {
    setAccessImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetCaptureState = useCallback(() => {
    revokePreviewUrl();
    setEvidenceCode(null);
    setPreviewMetadata(null);
    setCaptureError(null);
    setSelectedFile(null);
    setUploadDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [revokePreviewUrl]);

  const resetAccessState = useCallback(() => {
    revokeAccessUrl();
    setAccessMetadata(null);
    setAccessError(null);
    setAccessCode('');
    setCodeSubmitted(false);
  }, [revokeAccessUrl]);

  const runCaptureFromUrl = async () => {
    setCaptureError(null);
    let normalized: string;
    try {
      normalized = normalizeEvidenceUrl(formData.url);
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Invalid URL');
      return;
    }
    setCaptureLoading(true);
    try {
      const { code } = await captureEvidenceUrl(normalized);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const [meta, imageBlob] = await Promise.all([
        fetchEvidenceMetadata(code),
        fetchEvidenceImage(code),
      ]);
      setEvidenceCode(code);
      setPreviewMetadata(meta);
      setPreviewImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(imageBlob);
      });
      setStep(1);
      setView('create');
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Capture failed');
    } finally {
      setCaptureLoading(false);
    }
  };

  const runCaptureFromUpload = async () => {
    if (!selectedFile) return;
    setCaptureError(null);
    setCaptureLoading(true);
    try {
      const { code } = await uploadEvidenceImage(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormData({ url: '' });
      const [meta, imageBlob] = await Promise.all([
        fetchEvidenceMetadata(code),
        fetchEvidenceImage(code),
      ]);
      setEvidenceCode(code);
      setPreviewMetadata(meta);
      setPreviewImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(imageBlob);
      });
      setStep(1);
      setView('create');
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setCaptureLoading(false);
    }
  };

  const pickImageFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      setCaptureError(file ? 'Please choose an image file.' : null);
      return;
    }
    setCaptureError(null);
    setSelectedFile(file);
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 1) {
      resetCaptureState();
      setView('home');
      return;
    }
    setStep(step - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleAccessCodeSubmit = async () => {
    const raw = accessCode.trim();
    if (!raw) return;
    setAccessError(null);
    setAccessLoading(true);
    try {
      const [meta, imageBlob] = await Promise.all([
        fetchEvidenceMetadata(raw),
        fetchEvidenceImage(raw),
      ]);
      setAccessMetadata(meta);
      setAccessImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(imageBlob);
      });
      setCodeSubmitted(true);
    } catch (e) {
      setAccessError(e instanceof Error ? e.message : 'Retrieval failed');
    } finally {
      setAccessLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Sealed preview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review the image and capture metadata stored in your vault record.
              </p>
            </div>

            <div className={`${PANEL} p-4`}>
              <div
                className={`${PANEL_INNER} mb-4 flex min-h-[200px] items-center justify-center overflow-hidden`}
              >
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt="Captured evidence"
                    className="max-h-80 max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <p className="text-sm text-slate-500">No preview</p>
                )}
              </div>

              {previewMetadata ? (
                <div className="space-y-2">
                  <div className={`${PANEL_INNER} p-3`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                    <p className="mt-1 font-mono text-sm break-all text-slate-100">{previewMetadata.source_url}</p>
                  </div>

                  <div className={`${PANEL_INNER} p-3`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sealed at (UTC)</p>
                    <p className="mt-1 font-mono text-sm text-slate-100">
                      {formatCapturedAt(previewMetadata.captured_at)}
                    </p>
                  </div>

                  <div className={`${PANEL_INNER} p-3`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client IP (at capture)</p>
                    <p className="mt-1 font-mono text-sm text-slate-100">{previewMetadata.client_ip}</p>
                  </div>

                  <div className={`${PANEL_INNER} p-3`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User-Agent</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-300">
                      {previewMetadata.user_agent ?? '—'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Admissibility snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Indicators your locker can support for court-ready documentation (illustrative).
              </p>
            </div>

            <div className="space-y-3">
              <div className={`${PANEL} flex items-start gap-3 p-4`}>
                <input type="checkbox" checked readOnly className="mt-1 rounded border-slate-500" />
                <div>
                  <p className="font-semibold text-white">Technical authenticity</p>
                  <p className="text-sm text-slate-400">Signals related to synthetic or altered content</p>
                </div>
              </div>

              <div className={`${PANEL} flex items-start gap-3 p-4`}>
                <input type="checkbox" checked readOnly className="mt-1 rounded border-slate-500" />
                <div>
                  <p className="font-semibold text-white">Chain of custody</p>
                  <p className="text-sm text-slate-400">Timestamped capture tied to source and client context</p>
                </div>
              </div>

              <div className={`${PANEL} flex items-start gap-3 p-4`}>
                <input type="checkbox" checked readOnly className="mt-1 rounded border-slate-500" />
                <div>
                  <p className="font-semibold text-white">Impact documentation</p>
                  <p className="text-sm text-slate-400">Material that helps show scope of harm or spread</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">Review & seal</h2>
              <p className="mt-1 text-sm text-slate-400">Confirm details before you finalize this report.</p>
            </div>

            <div className="space-y-3">
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                <p className="mt-1 break-all text-slate-100">
                  {previewMetadata?.source_url ?? formData.url}
                </p>
              </div>

              {evidenceCode ? (
                <div
                  className={`${PANEL} shadow-[inset_0_2px_28px_rgba(0,0,0,0.35)] border-sky-800/40 p-5`}
                >
                  <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Retrieval code
                  </p>
                  <p className="mt-3 select-all break-all text-center font-mono text-2xl font-semibold tracking-wide text-sky-200 sm:text-3xl">
                    {evidenceCode}
                  </p>
                  <p className="mt-3 text-center text-xs text-slate-500">
                    You will see this code again after you submit — store it somewhere safe.
                  </p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              onClick={handleSubmit}
            >
              Submit & lock report
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className={`${PAGE_BG} flex flex-col items-center px-4 py-10 sm:px-8`}>
        <div className="w-full max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/90 lg:inline-flex">
                <VaultLockIcon className="h-3.5 w-3.5 text-emerald-400/90" />
                Report sealed
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your evidence is on file</h1>
                <p className="mt-2 text-slate-400">
                  Thank you. Keep the retrieval code below — it is how you or counsel unlock this sealed record.
                </p>
              </div>

              <div
                className={`${PANEL} shadow-[inset_0_2px_32px_rgba(0,0,0,0.45)] border-sky-800/50 px-4 py-10 sm:px-8`}
              >
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Your retrieval code</p>
                <p
                  className="mt-5 select-all break-all text-center font-mono text-4xl font-semibold leading-tight tracking-[0.06em] text-sky-100 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl"
                  title={evidenceCode ?? undefined}
                >
                  {evidenceCode ?? '—'}
                </p>
                {previewMetadata ? (
                  <p className="mt-6 text-center text-sm text-slate-500">
                    Sealed at{' '}
                    <span className="font-mono text-slate-300">{formatCapturedAt(previewMetadata.captured_at)}</span>
                  </p>
                ) : (
                  <p className="mt-6 text-center text-sm text-slate-500">Store this code in a safe place.</p>
                )}
              </div>

              <button
                type="button"
                className="w-full rounded-xl border border-slate-600/80 bg-slate-900/50 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900/80 lg:max-w-md"
                onClick={() => {
                  setSubmitted(false);
                  setStep(1);
                  setView('home');
                  setFormData({ url: '' });
                  resetCaptureState();
                }}
              >
                Back to home
              </button>
            </div>

            <aside className={`${PANEL} p-6 sm:p-8`}>
              <div className="mb-6 flex items-start gap-3 border-b border-slate-700/80 pb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-950/60 text-slate-400">
                  <VaultLockIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Legal support</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    Optional next step: reach out to a lawyer who works with digital evidence. No pressure — pick someone
                    who fits your situation.
                  </p>
                </div>
              </div>
              <LawyerCards idPrefix="confirm" />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className={`${PAGE_BG} flex min-h-screen flex-col`}>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
          <header className="mb-8 flex items-center justify-between gap-3 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-2 text-slate-300">
              <VaultLockIcon className="h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence Locker</p>
                <p className="text-sm text-slate-400">Protected workflow</p>
              </div>
            </div>
            <span className="hidden text-right text-xs text-slate-600 sm:block">Chain of custody</span>
          </header>

          <div className="mb-8 flex justify-between gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    s < step
                      ? 'bg-emerald-600/90 text-white ring-2 ring-emerald-500/40'
                      : s === step
                        ? 'bg-sky-600 text-white ring-2 ring-sky-400/40'
                        : 'border border-slate-600 bg-slate-900/80 text-slate-500'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
                  {CREATE_STEP_LABELS[s - 1]}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-8 min-h-0 flex-1 overflow-y-auto">{renderStep()}</div>

          <div className="flex gap-3 border-t border-slate-800/80 pt-6">
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-600/80 bg-slate-900/50 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/80 disabled:opacity-40"
              onClick={prevStep}
              disabled={captureLoading}
            >
              Back
            </button>
            {step < 3 && (
              <button
                type="button"
                className="flex-1 rounded-xl bg-sky-600 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-500 disabled:opacity-40"
                onClick={nextStep}
                disabled={captureLoading}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'access') {
    if (codeSubmitted && accessMetadata && accessImageUrl) {
      return (
        <div className={`${PAGE_BG} flex min-h-screen flex-col items-center px-4 py-10 sm:px-8`}>
          <div className="w-full max-w-lg">
            <div className="mb-6 flex items-center gap-2 text-slate-500">
              <VaultLockIcon className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Unsealed view</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">Retrieved evidence</h1>
            <p className="mt-1 text-sm text-slate-400">Decrypted from your vault using the code you entered.</p>

            <div className={`${PANEL} mt-6 overflow-hidden p-2`}>
              <div className={`${PANEL_INNER} overflow-hidden`}>
                <img
                  src={accessImageUrl}
                  alt="Stored evidence"
                  className="max-h-80 w-full bg-black object-contain"
                />
              </div>
            </div>

            <div className="mb-8 mt-6 space-y-3 text-left">
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-100">{accessMetadata.source_url}</p>
              </div>
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sealed at (UTC)</p>
                <p className="mt-1 font-mono text-sm text-slate-100">{formatCapturedAt(accessMetadata.captured_at)}</p>
              </div>
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client IP (at capture)</p>
                <p className="mt-1 font-mono text-sm text-slate-100">{accessMetadata.client_ip}</p>
              </div>
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User-Agent</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-300">{accessMetadata.user_agent ?? '—'}</p>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-600/80 bg-slate-900/50 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900/80"
              onClick={() => {
                setView('home');
                resetAccessState();
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`${PAGE_BG} flex min-h-screen flex-col items-center justify-center px-6 py-16`}>
        <div className="w-full max-w-lg">
          <button
            type="button"
            className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300"
            onClick={() => {
              setView('home');
              resetAccessState();
            }}
          >
            <span aria-hidden>←</span> Back
          </button>

          <div className="mb-8 flex items-center gap-2 text-slate-500">
            <VaultLockIcon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Counsel access</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">Open a sealed record</h1>
          <p className="mt-2 text-slate-400">
            Enter the retrieval code (<span className="font-mono text-slate-300">XXXX-YYYYYYYY</span>) to load metadata
            and the PNG image from the vault.
          </p>

          {accessError ? (
            <p className="mt-6 rounded-xl border border-red-800/80 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {accessError}
            </p>
          ) : null}

          <div className={`${PANEL} mt-8 p-2 pl-4`}>
            <label htmlFor="access-code" className="sr-only">
              Evidence retrieval code
            </label>
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              className="w-full border-0 bg-transparent py-3.5 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
              placeholder="e.g. Ab12-xYz9AbCd"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && accessCode.trim() && !accessLoading) {
                  void handleAccessCodeSubmit();
                }
              }}
            />
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => void handleAccessCodeSubmit()}
            disabled={!accessCode.trim() || accessLoading}
          >
            {accessLoading ? 'Unlocking…' : 'Retrieve evidence'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${PAGE_BG} flex flex-col items-center justify-center px-6 py-16`}>
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-2 text-slate-500">
          <VaultLockIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Evidence Locker</span>
        </div>

        <img
          src="/icon.png"
          alt=""
          className="mx-auto mb-6 block h-10 w-auto max-w-[min(100%,22rem)] object-contain opacity-95"
        />

        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Seal a page or an image</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Encrypted storage with a retrieval code — built for a clear chain of custody.
        </p>

        <label htmlFor="home-url" className="sr-only">
          Page URL to capture
        </label>

        <div className="mt-10 w-full">
        {captureError ? (
          <p className="mb-4 w-full rounded-lg border border-red-800/80 bg-red-950/40 px-3 py-2 text-left text-sm text-red-300">
            {captureError}
          </p>
        ) : null}

        <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/60 shadow-xl shadow-slate-950/50 backdrop-blur-sm p-2 pl-4 flex items-center gap-3 ring-1 ring-white/5">
          <span className="text-slate-500 shrink-0 select-none" aria-hidden>
            ↗
          </span>
          <input
            id="home-url"
            type="url"
            autoComplete="url"
            inputMode="url"
            className="flex-1 min-w-0 bg-transparent border-0 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
            placeholder="Paste a link to capture"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && formData.url.trim() && !captureLoading) {
                void runCaptureFromUrl();
              }
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            onClick={() => void runCaptureFromUrl()}
            disabled={!formData.url.trim() || captureLoading}
          >
            {captureLoading ? '…' : 'Go'}
          </button>
        </div>

        <div className="mt-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-slate-700/90" aria-hidden />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            or
          </span>
          <div className="h-px flex-1 bg-slate-700/90" aria-hidden />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="home-upload"
          onChange={(e) => pickImageFile(e.target.files?.[0])}
        />

        <div
          role="button"
          tabIndex={0}
          className={`mt-4 w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ring-1 ring-white/5 ${
            uploadDragActive
              ? 'border-sky-400/80 bg-sky-950/30'
              : 'border-slate-600/80 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadDragActive(false);
            pickImageFile(e.dataTransfer.files?.[0]);
          }}
        >
          <p className="text-sm font-medium text-slate-200">Drop an image here or click to browse</p>
          <p className="mt-1 text-xs text-slate-500">PNG, JPEG, WebP, or other common formats — max 10 MB</p>
          {selectedFile ? (
            <p className="mt-3 truncate font-mono text-xs text-sky-300/90" title={selectedFile.name}>
              {selectedFile.name}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          onClick={() => void runCaptureFromUpload()}
          disabled={!selectedFile || captureLoading}
        >
          {captureLoading ? 'Uploading…' : 'Upload evidence'}
        </button>

        <p className="mt-10 text-sm text-slate-500">
          <button
            type="button"
            className="text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-300 hover:decoration-slate-500"
            onClick={() => {
              resetAccessState();
              setView('access');
            }}
          >
            I am a lawyer
          </button>
        </p>
        </div>
      </div>
    </div>
  );
}

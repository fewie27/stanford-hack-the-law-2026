import './global.css';
import { useCallback, useRef, useState } from 'react';

import {
  captureEvidenceUrl,
  classifyEvidence,
  fetchEvidenceImage,
  fetchEvidenceMetadata,
  normalizeEvidenceUrl,
  uploadEvidenceImage,
  type ClassificationResult,
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
  photo?: string;
  email?: string;
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
  {
    name: 'Riana Pfefferkorn',
    focus: 'Internet law & digital rights',
    hint: 'Research scholar at Stanford Internet Observatory focused on encryption, surveillance, and online content.',
    initial: 'RP',
    accent: 'border-l-rose-500/70',
    avatar: 'bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/25',
    photo: '/pfefferkorn.png',
    email: 'riana@stanford.edu',
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
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold overflow-hidden ${L.photo ? '' : L.avatar}`}
            aria-hidden
          >
            {L.photo ? (
              <img src={L.photo} alt={L.name} className="h-full w-full object-cover" />
            ) : (
              L.initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{L.name}</p>
            <p className="text-sm text-slate-400">{L.focus}</p>
            <p className="mt-2 text-sm leading-snug text-slate-300">{L.hint}</p>
            <p className="mt-2 text-xs font-medium text-emerald-400/90">
              Free initial consultation
            </p>
            {L.email ? (
              <a
                href={`mailto:${L.email}`}
                id={`${idPrefix}-lawyer-${i}`}
                className="mt-3 inline-block text-sm font-medium text-sky-400/95 underline-offset-4 hover:text-sky-300 hover:underline"
              >
                {L.email}
              </a>
            ) : (
              <button
                type="button"
                id={`${idPrefix}-lawyer-${i}`}
                className="mt-3 text-sm font-medium text-sky-400/95 underline-offset-4 hover:text-sky-300 hover:underline"
              >
                Request intro
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Formats ISO timestamp in the viewer's local timezone (browser default). */
function formatCapturedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZoneName: 'short',
    });
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

  const [classifyResult, setClassifyResult] = useState<ClassificationResult | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);

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
    setClassifyResult(null);
    setClassifyError(null);
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
    if (step < 3) {
      const next = step + 1;
      setStep(next);
      // Kick off classification when entering Analysis step
      if (next === 2 && !classifyResult && !classifyLoading) {
        const url = previewMetadata?.source_url ?? formData.url;
        if (url && !url.startsWith('upload:')) {
          setClassifyLoading(true);
          setClassifyError(null);
          classifyEvidence(url)
            .then((r) => setClassifyResult(r))
            .catch((e) => setClassifyError(e instanceof Error ? e.message : 'Classification failed'))
            .finally(() => setClassifyLoading(false));
        }
      }
    }
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
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sealed at</p>
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
              <h2 className="text-xl font-bold tracking-tight text-white">Content analysis</h2>
              <p className="mt-1 text-sm text-slate-400">
                AI-powered classification of the captured content for evidence documentation.
              </p>
            </div>

            {classifyLoading ? (
              <div className={`${PANEL} flex flex-col items-center justify-center gap-3 p-8`}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
                <p className="text-sm text-slate-400">Analyzing content&hellip;</p>
              </div>
            ) : classifyError ? (
              <div className={`${PANEL} border-l-4 border-l-amber-500/70 p-4`}>
                <p className="font-semibold text-amber-200">Classification unavailable</p>
                <p className="mt-1 text-sm text-slate-400">{classifyError}</p>
              </div>
            ) : classifyResult ? (
              <div className="space-y-3">
                {/* Category + confidence */}
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</p>
                  <p className="mt-1 font-semibold text-white">{classifyResult.category}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          classifyResult.confidence >= 0.75
                            ? 'bg-emerald-500'
                            : classifyResult.confidence >= 0.5
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.round(classifyResult.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-slate-300">
                      {Math.round(classifyResult.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{classifyResult.summary}</p>
                </div>

                {/* Tags */}
                {classifyResult.suggested_tags.length > 0 && (
                  <div className={`${PANEL} p-4`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Evidence tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {classifyResult.suggested_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-600/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input type */}
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Analyzed as</p>
                  <p className="mt-1 text-sm text-slate-300 capitalize">{classifyResult.input_type}</p>
                </div>
              </div>
            ) : (
              /* Fallback for uploads (no URL to classify) — show original static checks */
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
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">Review & seal</h2>
              <p className="mt-1 text-sm text-slate-400">
                Confirm the source below. Your retrieval code (the decryption key) is shown only after you submit.
              </p>
            </div>

            <div className="space-y-3">
              <div className={`${PANEL} p-4`}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                <p className="mt-1 break-all text-slate-100">
                  {previewMetadata?.source_url ?? formData.url}
                </p>
              </div>
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
              <div className="inline-flex items-center justify-center gap-3 rounded-full border border-emerald-500/35 bg-emerald-950/45 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/95 lg:inline-flex">
                <VaultLockIcon className="h-8 w-8 shrink-0 text-emerald-400" />
                Report sealed
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your evidence is on file</h1>
                <p className="mt-2 text-slate-400">
                  Thank you. The vault stores your file encrypted; the code below includes the key needed to decrypt and
                  retrieve it. Share it only with people you trust.
                </p>
              </div>

              <div
                className={`${PANEL} shadow-[inset_0_2px_32px_rgba(0,0,0,0.45)] border-emerald-900/35 px-4 py-8 sm:px-8`}
              >
                <div className="mb-5 flex justify-center lg:justify-start">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-950/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                    aria-hidden
                  >
                    <VaultLockIcon className="h-12 w-12" />
                  </div>
                </div>
                <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-500 lg:text-left">
                  Your retrieval code
                </p>
                <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-slate-400 lg:mx-0 lg:text-left">
                  This code is your decryption key. Without it, the encrypted evidence cannot be unlocked.
                </p>
                <p
                  className="mt-6 select-all break-all text-center font-mono text-3xl font-semibold leading-snug tracking-[0.05em] text-emerald-400 sm:text-4xl md:text-5xl lg:text-left"
                  title={evidenceCode ?? undefined}
                >
                  {evidenceCode ?? '—'}
                </p>
                {previewMetadata ? (
                  <p className="mt-6 text-center text-sm text-slate-500 lg:text-left">
                    Sealed at{' '}
                    <span className="font-mono text-slate-300">{formatCapturedAt(previewMetadata.captured_at)}</span>
                  </p>
                ) : (
                  <p className="mt-6 text-center text-sm text-slate-500 lg:text-left">Store this code in a safe place.</p>
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
              <div className="mb-6 flex items-start gap-4 border-b border-slate-700/80 pb-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-950/35 text-emerald-400/95">
                  <VaultLockIcon className="h-8 w-8" />
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
      <div className={`${PAGE_BG} min-h-screen`}>
        <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-8 sm:px-8 pb-12">
          <header className="mb-8 flex items-center justify-between gap-3 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-600/70 bg-slate-950/55 text-emerald-500/90 ring-1 ring-white/5">
                <VaultLockIcon className="h-9 w-9" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence Locker</p>
                <p className="text-sm text-slate-400">Encrypted vault workflow</p>
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

          <div className="mb-8">{renderStep()}</div>

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
        <div className={`${PAGE_BG} min-h-screen px-4 py-8 sm:px-8 sm:py-10`}>
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3 text-slate-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-950/30 text-emerald-400/90">
                    <VaultLockIcon className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">Unsealed view</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Retrieved evidence</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-400">
                  Decrypted from your vault using the code you entered. On a wide screen, the image stays large with
                  details beside it.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
              <div className="lg:col-span-7 xl:col-span-8">
                <div className={`${PANEL} p-2`}>
                  <div
                    className={`${PANEL_INNER} flex min-h-[min(280px,50vh)] items-center justify-center bg-black/90`}
                  >
                    <img
                      src={accessImageUrl}
                      alt="Stored evidence"
                      className="h-auto w-full max-h-[min(85vh,920px)] object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-5 xl:col-span-4 lg:max-h-[min(85vh,920px)] lg:overflow-y-auto lg:pr-1">
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-100">{accessMetadata.source_url}</p>
                </div>
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sealed at</p>
                  <p className="mt-1 font-mono text-sm leading-relaxed text-slate-100">
                    {formatCapturedAt(accessMetadata.captured_at)}
                  </p>
                </div>
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client IP (at capture)</p>
                  <p className="mt-1 font-mono text-sm text-slate-100">{accessMetadata.client_ip}</p>
                </div>
                <div className={`${PANEL} p-4`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User-Agent</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-300">{accessMetadata.user_agent ?? '—'}</p>
                </div>

                <button
                  type="button"
                  className="w-full shrink-0 rounded-xl border border-slate-600/80 bg-slate-900/50 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900/80"
                  onClick={() => {
                    setView('home');
                    resetAccessState();
                  }}
                >
                  Back to home
                </button>
              </div>
            </div>
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

          <div className="mb-8 flex items-center gap-4 text-slate-500">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-600/70 bg-slate-950/50 text-emerald-500/85 ring-1 ring-white/5">
              <VaultLockIcon className="h-9 w-9" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Counsel access</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">Open a sealed record</h1>
          <p className="mt-2 text-slate-400">
            Enter your retrieval code (the decryption key, format{' '}
            <span className="font-mono text-slate-300">XXXX-YYYYYYYY</span>) to decrypt and load metadata and the PNG
            from the vault.
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
        <div className="mb-2 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-950/25 text-emerald-400 shadow-lg shadow-emerald-950/30 ring-1 ring-white/5">
            <VaultLockIcon className="h-10 w-10" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Evidence Locker</span>
        </div>

        <img
          src="/icon.png"
          alt=""
          className="mx-auto mb-0 block h-60 w-auto max-w-[min(100%,22rem)] object-contain opacity-95"
        />

        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Seal a page or an image</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Files are encrypted in the vault; your retrieval code includes the key to decrypt them — built for a clear
          chain of custody.
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

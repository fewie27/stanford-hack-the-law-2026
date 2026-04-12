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

type View = 'home' | 'create' | 'access' | 'lawyers';

const CREATE_STEP_LABELS = ['Screenshot', 'Analysis', 'Review'] as const;

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
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Screenshot Preview</h2>
            <p className="text-sm text-gray-300 mb-4">
              Review the screenshot and metadata returned from the Evidence Locker API.
            </p>

            <div className="bg-gray-700 rounded p-4 mb-4">
              <div className="bg-gray-800 rounded mb-4 min-h-[200px] flex items-center justify-center overflow-hidden">
                {previewImageUrl ? (
                  <img src={previewImageUrl} alt="Captured page" className="max-w-full max-h-80 object-contain rounded" />
                ) : (
                  <p className="text-gray-500 text-sm">No preview</p>
                )}
              </div>

              {previewMetadata ? (
                <div className="space-y-2">
                  <div className="p-2 bg-gray-600 rounded">
                    <p className="text-gray-300 text-xs">Source URL</p>
                    <p className="text-white font-mono text-sm break-all">{previewMetadata.source_url}</p>
                  </div>

                  <div className="p-2 bg-gray-600 rounded">
                    <p className="text-gray-300 text-xs">Uploaded at</p>
                    <p className="text-white font-mono text-sm">{formatCapturedAt(previewMetadata.captured_at)}</p>
                  </div>

                  <div className="p-2 bg-gray-600 rounded">
                    <p className="text-gray-300 text-xs">Client IP (at capture)</p>
                    <p className="text-white font-mono text-sm">{previewMetadata.client_ip}</p>
                  </div>

                  <div className="p-2 bg-gray-600 rounded">
                    <p className="text-gray-300 text-xs">User-Agent</p>
                    <p className="text-white font-mono text-xs break-all">
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
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Analysis & Admissibility</h2>
            <p className="text-sm text-gray-300 mb-4">
              Based on our analysis, this can classify your evidence. The following can be admissible in court:
            </p>

            <div className="space-y-2">
              <div className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                <input type="checkbox" checked readOnly className="mt-1" />
                <div>
                  <p className="text-white font-semibold">Technical Authenticity</p>
                  <p className="text-sm text-gray-300">Evidence of AI-generated or manipulated content</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                <input type="checkbox" checked readOnly className="mt-1" />
                <div>
                  <p className="text-white font-semibold">Chain of Custody</p>
                  <p className="text-sm text-gray-300">Documented timeline and source of the evidence</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                <input type="checkbox" checked readOnly className="mt-1" />
                <div>
                  <p className="text-white font-semibold">Impact Documentation</p>
                  <p className="text-sm text-gray-300">Evidence of harm caused by the deepfake</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Review</h2>

            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Source</p>
                <p className="text-white font-semibold break-all">
                  {previewMetadata?.source_url ?? formData.url}
                </p>
              </div>

              {evidenceCode ? (
                <div className="p-3 bg-gray-700 rounded border border-sky-700">
                  <p className="text-gray-300 text-sm">Evidence code</p>
                  <p className="text-sky-300 font-mono font-semibold break-all">{evidenceCode}</p>
                  <p className="text-gray-400 text-xs mt-1">Save this code to retrieve the screenshot later.</p>
                </div>
              ) : null}
            </div>

            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-6"
              onClick={handleSubmit}
            >
              Submit Report
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Submitted</h1>
          <p className="text-white mb-6">Your evidence report has been successfully submitted.</p>

          <div className="bg-gray-700 p-4 rounded mb-6 text-left">
            <p className="text-gray-300 text-sm mb-1">Evidence code</p>
            <p className="text-white font-mono break-all">{evidenceCode ?? '—'}</p>
            {previewMetadata ? (
              <>
                <p className="text-gray-300 text-sm mt-3 mb-1">Uploaded at</p>
                <p className="text-white font-mono text-sm">{formatCapturedAt(previewMetadata.captured_at)}</p>
              </>
            ) : null}
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Thank you for your report. Our legal team will review your submission.
          </p>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              setSubmitted(false);
              setStep(1);
              setView('home');
              setFormData({ url: '' });
              resetCaptureState();
            }}
          >
            Back to Home
          </button>

          <button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={() => {
              setSubmitted(false);
              setView('lawyers');
            }}
          >
            Connect with a Lawyer
          </button>
        </div>
      </div>
    );
  }

  if (view === 'lawyers') {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-slate-800 p-8 rounded-lg max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Connect with a Lawyer</h1>
          <p className="text-gray-300 text-center mb-6">Our network of legal experts is ready to help you</p>

          <div className="space-y-3 mb-6">
            <div className="bg-gray-700 p-4 rounded cursor-pointer hover:bg-gray-600 transition">
              <p className="text-white font-semibold">Sarah Martinez, Esq.</p>
              <p className="text-gray-300 text-sm">Cybercrime & Digital Rights Specialist</p>
              <p className="text-blue-400 text-xs mt-1">Free Initial Consultation</p>
            </div>

            <div className="bg-gray-700 p-4 rounded cursor-pointer hover:bg-gray-600 transition">
              <p className="text-white font-semibold">James Chen, Esq.</p>
              <p className="text-gray-300 text-sm">Media Law & Defamation Expert</p>
              <p className="text-blue-400 text-xs mt-1">Free Initial Consultation</p>
            </div>

            <div className="bg-gray-700 p-4 rounded cursor-pointer hover:bg-gray-600 transition">
              <p className="text-white font-semibold">Rachel Thompson, Esq.</p>
              <p className="text-gray-300 text-sm">AI & Deepfake Litigation</p>
              <p className="text-blue-400 text-xs mt-1">Free Initial Consultation</p>
            </div>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              setSubmitted(false);
              setStep(1);
              setView('home');
              setFormData({ url: '' });
              resetCaptureState();
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col">
        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          <div className="flex justify-between mb-8 gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex justify-center items-center font-bold ${
                    s < step
                      ? 'bg-green-600 text-white'
                      : s === step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                <p className="text-xs text-gray-300 mt-2 text-center">
                  {CREATE_STEP_LABELS[s - 1]}
                </p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto mb-8">{renderStep()}</div>

          <div className="flex justify-between gap-4">
            <button
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              onClick={prevStep}
              disabled={captureLoading}
            >
              Back
            </button>
            {step < 3 && (
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
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
        <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="bg-slate-800 p-8 rounded-lg max-w-lg w-full">
            <h1 className="text-2xl font-bold text-white mb-2">Your evidence</h1>

            <div className="bg-gray-700 rounded mb-4 overflow-hidden">
              <img src={accessImageUrl} alt="Stored evidence" className="w-full object-contain max-h-80 bg-black" />
            </div>

            <div className="space-y-2 text-left mb-6">
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">Source URL</p>
                <p className="text-white font-mono text-sm break-all">{accessMetadata.source_url}</p>
              </div>
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">Uploaded at</p>
                <p className="text-white font-mono text-sm">{formatCapturedAt(accessMetadata.captured_at)}</p>
              </div>
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">Client IP (at capture)</p>
                <p className="text-white font-mono text-sm">{accessMetadata.client_ip}</p>
              </div>
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">User-Agent</p>
                <p className="text-white font-mono text-xs break-all">{accessMetadata.user_agent ?? '—'}</p>
              </div>
            </div>

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                setView('home');
                resetAccessState();
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full">
          <button
            className="mb-6 text-gray-400 hover:text-white text-sm"
            onClick={() => {
              setView('home');
              resetAccessState();
            }}
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-white mb-2">Access My Files</h1>
          <p className="text-gray-300 mb-6">
            Enter your evidence code (from capture: <span className="font-mono text-slate-200">XXXX-YYYYYYYY</span>) to
            load metadata and the PNG screenshot.
          </p>

          {accessError ? (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded p-2 mb-4">{accessError}</p>
          ) : null}

          <input
            type="text"
            className="w-full border border-gray-300 rounded p-3 text-white bg-gray-700 placeholder-gray-400 mb-6 font-mono"
            placeholder="e.g. Ab12-xYz9AbCd"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />

          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            onClick={() => void handleAccessCodeSubmit()}
            disabled={!accessCode.trim() || accessLoading}
          >
            {accessLoading ? 'Loading…' : 'Retrieve evidence'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        <img
          src="/icon.png"
          alt=""
          className="mx-auto block h-10 w-auto max-w-[min(100%,22rem)] object-contain mb-10 opacity-95"
        />

        <label htmlFor="home-url" className="sr-only">
          Page URL to capture
        </label>
        {captureError ? (
          <p className="w-full text-sm text-red-300 bg-red-950/40 border border-red-800/80 rounded-lg px-3 py-2 mb-4 text-left">
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
            className="text-slate-400 underline underline-offset-4 decoration-slate-600 hover:text-slate-300 hover:decoration-slate-500 transition-colors"
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
  );
}

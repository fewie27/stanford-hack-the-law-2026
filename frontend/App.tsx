import './global.css';
import { useCallback, useState } from 'react';

import {
  captureEvidenceUrl,
  fetchEvidenceImage,
  fetchEvidenceMetadata,
  getEvidenceApiBaseUrl,
  isProductionEvidenceApi,
  normalizeEvidenceUrl,
  type EvidenceMetadata,
} from './evidenceApi';

type FormData = {
  role: string;
  url: string;
  platform: string;
  date: string;
  fileName: string;
};

type View = 'home' | 'create' | 'access' | 'lawyers';

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
  const apiBase = getEvidenceApiBaseUrl();
  const apiMode = isProductionEvidenceApi() ? 'Server API' : 'Local dev (localhost:8000)';

  const [view, setView] = useState<View>('home');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    role: '',
    url: '',
    platform: '',
    date: '',
    fileName: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  const [evidenceCode, setEvidenceCode] = useState<string | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<EvidenceMetadata | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

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
  }, [revokePreviewUrl]);

  const resetAccessState = useCallback(() => {
    revokeAccessUrl();
    setAccessMetadata(null);
    setAccessError(null);
    setAccessCode('');
    setCodeSubmitted(false);
  }, [revokeAccessUrl]);

  const nextStep = async () => {
    if (step === 1) {
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
        setStep(2);
      } catch (e) {
        setCaptureError(e instanceof Error ? e.message : 'Capture failed');
      } finally {
        setCaptureLoading(false);
      }
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 2) {
      resetCaptureState();
    }
    if (step > 1) setStep(step - 1);
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
            <h2 className="text-xl font-bold text-white">Evidence Information</h2>
            <p className="text-sm text-gray-300">
              Enter the public web page URL to capture. The server takes a screenshot and stores it as
              encrypted evidence.
            </p>
            {captureError ? (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded p-2">
                {captureError}
              </p>
            ) : null}

            <input
              type="url"
              className="w-full border border-gray-300 rounded p-2 text-white bg-gray-700 placeholder-gray-400"
              placeholder="https://example.com/page"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />

            <input
              className="w-full border border-gray-300 rounded p-2 text-white bg-gray-700 placeholder-gray-400"
              placeholder="Platform (e.g., Twitter, TikTok) — optional"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            />

            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2 text-white bg-gray-700"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        );

      case 2:
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
                    <p className="text-gray-300 text-xs">Captured at</p>
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

      case 3:
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

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Review Submission</h2>

            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">URL</p>
                <p className="text-white font-semibold break-all">{formData.url}</p>
              </div>

              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Platform</p>
                <p className="text-white font-semibold">{formData.platform || '—'}</p>
              </div>

              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Date discovered</p>
                <p className="text-white font-semibold">{formData.date || '—'}</p>
              </div>

              {evidenceCode ? (
                <div className="p-3 bg-gray-700 rounded border border-sky-700">
                  <p className="text-gray-300 text-sm">Evidence code</p>
                  <p className="text-sky-300 font-mono font-semibold break-all">{evidenceCode}</p>
                  <p className="text-gray-400 text-xs mt-1">Save this code to retrieve the screenshot later.</p>
                </div>
              ) : null}

              {formData.fileName ? (
                <div className="p-3 bg-gray-700 rounded">
                  <p className="text-gray-300 text-sm">Files</p>
                  <p className="text-white font-semibold text-sm break-all">{formData.fileName}</p>
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
                <p className="text-gray-300 text-sm mt-3 mb-1">Captured at</p>
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
              setFormData({
                role: '',
                url: '',
                platform: '',
                date: '',
                fileName: '',
              });
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
              setFormData({
                role: '',
                url: '',
                platform: '',
                date: '',
                fileName: '',
              });
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
          <p className="text-xs text-slate-500 mb-2">
            API: {apiMode} · <span className="font-mono text-slate-400">{apiBase}</span>
          </p>
          <div className="flex justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
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
                  {['Info', 'Screenshot', 'Analysis', 'Review'][s - 1]}
                </p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto mb-8">{renderStep()}</div>

          <div className="flex justify-between gap-4">
            {step > 1 && (
              <button
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={prevStep}
                disabled={captureLoading}
              >
                Back
              </button>
            )}
            {step < 4 && (
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                onClick={() => void nextStep()}
                disabled={captureLoading || (step === 1 && !formData.url.trim())}
              >
                {step === 1 && captureLoading ? 'Capturing…' : 'Next'}
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
            <p className="text-gray-400 text-xs font-mono mb-4 break-all">{apiBase}</p>

            <div className="bg-gray-700 rounded mb-4 overflow-hidden">
              <img src={accessImageUrl} alt="Stored evidence" className="w-full object-contain max-h-80 bg-black" />
            </div>

            <div className="space-y-2 text-left mb-6">
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">Source URL</p>
                <p className="text-white font-mono text-sm break-all">{accessMetadata.source_url}</p>
              </div>
              <div className="p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">Captured at</p>
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
          <p className="text-gray-300 mb-2">
            Enter your evidence code (from capture: <span className="font-mono text-slate-200">XXXX-YYYYYYYY</span>) to
            load metadata and the PNG screenshot.
          </p>
          <p className="text-xs text-slate-500 font-mono mb-6 break-all">{apiBase}</p>

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
    <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <div className="bg-slate-800 p-12 rounded-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Hi, we're sorry for what happened.</h1>
        <p className="text-gray-300 mb-2">Let us help.</p>
        <p className="text-xs text-slate-500 mb-8 font-mono break-all">{apiBase}</p>
        <p className="text-xs text-slate-600 mb-8">{apiMode}</p>

        <div className="space-y-4">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
            onClick={() => {
              setView('create');
              setStep(1);
            }}
          >
            Create New Report
          </button>

          <button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded text-lg"
            onClick={() => {
              resetAccessState();
              setView('access');
            }}
          >
            Access My Files
          </button>
        </div>
      </div>
    </div>
  );
}

import './global.css';
import { useState } from 'react';

type FormData = {
  role: string;
  url: string;
  platform: string;
  date: string;
  fileName: string;
};

type View = 'home' | 'create' | 'access' | 'lawyers';

export default function App() {
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

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleAccessCodeSubmit = () => {
    setCodeSubmitted(true);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Evidence Information</h2>
            <p className="text-sm text-gray-300">Please provide details about where the deepfake was found.</p>
            
            <input
              type="url"
              className="w-full border border-gray-300 rounded p-2 text-white bg-gray-700 placeholder-gray-400"
              placeholder="URL where deepfake was found"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
            
            <input
              className="w-full border border-gray-300 rounded p-2 text-white bg-gray-700 placeholder-gray-400"
              placeholder="Platform (e.g., Twitter, TikTok, Facebook)"
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
            <p className="text-sm text-gray-300 mb-4">Review the screenshot and metadata captured from the URL.</p>
            
            <div className="bg-gray-700 rounded p-4 mb-4">
              <div className="bg-gray-800 rounded mb-4 h-64 flex items-center justify-center">
                <img src="https://via.placeholder.com/400x300?text=Screenshot+Preview" alt="Screenshot" className="rounded" />
              </div>
              
              <div className="space-y-2">
                <div className="p-2 bg-gray-600 rounded">
                  <p className="text-gray-300 text-xs">Timestamp:</p>
                  <p className="text-white font-mono text-sm">2026-04-12 14:32:18 UTC</p>
                </div>
                
                <div className="p-2 bg-gray-600 rounded">
                  <p className="text-gray-300 text-xs">IP Address:</p>
                  <p className="text-white font-mono text-sm">203.0.113.42</p>
                </div>
                
                <div className="p-2 bg-gray-600 rounded">
                  <p className="text-gray-300 text-xs">User Agent:</p>
                  <p className="text-white font-mono text-xs break-all">Mozilla/5.0 (Windows NT 10.0; Win64; x64)</p>
                </div>
                
                <div className="p-2 bg-gray-600 rounded">
                  <p className="text-gray-300 text-xs">Server Response Time:</p>
                  <p className="text-white font-mono text-sm">245ms</p>
                </div>
              </div>
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
            <h2 className="text-xl font-bold text-white text-center mb-6">Review Submission</h2>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">URL:</p>
                <p className="text-white font-semibold break-all">{formData.url}</p>
              </div>
              
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Platform:</p>
                <p className="text-white font-semibold">{formData.platform}</p>
              </div>
              
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Date Discovered:</p>
                <p className="text-white font-semibold">{formData.date}</p>
              </div>
              
              {formData.fileName && (
                <div className="p-3 bg-gray-700 rounded">
                  <p className="text-gray-300 text-sm">Files:</p>
                  <p className="text-white font-semibold text-sm break-all">{formData.fileName}</p>
                </div>
              )}
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
            <p className="text-gray-300 text-sm mb-1">Report ID:</p>
            <p className="text-white font-mono break-all">abc123def456</p>
            <p className="text-gray-300 text-sm mt-3 mb-1">Timestamp:</p>
            <p className="text-white font-mono">2026-04-12 12:00:00</p>
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
          {/* Progress Indicator */}
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

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto mb-8">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            {step > 1 && (
              <button
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={prevStep}
              >
                Back
              </button>
            )}
            {step < 4 && (
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={nextStep}
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
    if (codeSubmitted) {
      return (
        <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
          <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-white mb-4">Access Code Submitted</h1>
            <p className="text-gray-300 mb-6">Your access code has been submitted. The backend will process your request and retrieve your files.</p>
            
            <div className="bg-gray-700 p-4 rounded mb-6">
              <p className="text-gray-300 text-sm mb-1">Access Code:</p>
              <p className="text-white font-mono">{accessCode}</p>
            </div>
            
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                setView('home');
                setAccessCode('');
                setCodeSubmitted(false);
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
            onClick={() => setView('home')}
          >
            ← Back
          </button>
          
          <h1 className="text-2xl font-bold text-white mb-2">Access My Files</h1>
          <p className="text-gray-300 mb-6">Enter your access code to retrieve your submitted reports.</p>
          
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-3 text-white bg-gray-700 placeholder-gray-400 mb-6"
            placeholder="Enter your access code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
          
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            onClick={handleAccessCodeSubmit}
            disabled={!accessCode.trim()}
          >
            Submit Access Code
          </button>
        </div>
      </div>
    );
  }

  // Home view
  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <div className="bg-slate-800 p-12 rounded-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Hi, we're sorry for what happened.</h1>
        <p className="text-gray-300 mb-8">Let us help.</p>
        
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
            onClick={() => setView('access')}
          >
            Access My Files
          </button>
        </div>
      </div>
    </div>
  );
}
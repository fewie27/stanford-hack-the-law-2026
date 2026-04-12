import './global.css';
import { useState } from 'react';

type FormData = {
  role: string;
  url: string;
  platform: string;
  date: string;
  fileName: string;
};

export default function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    role: '',
    url: '',
    platform: '',
    date: '',
    fileName: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Hi, we're sorry for what happened.</h2>
              <p className="text-gray-300 mb-6">We're here to help you document and report deepfakes.</p>
            </div>
            <div className="space-y-3">
              <p className="text-white font-semibold">I am a:</p>
              {['Victim', 'Lawyer', 'Advocate', 'Other'].map((role) => (
                <label key={role} className="flex items-center justify-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">{role}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 2:
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
            <h2 className="text-xl font-bold text-white">Upload Complete Submission</h2>
            <p className="text-sm text-gray-300 mb-4">
              Please upload your complete documentation, screenshots, or media files.
            </p>
            
            <div className="border-2 border-dashed border-gray-400 rounded p-6 text-center">
              <input
                type="file"
                multiple
                className="w-full"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const names = Array.from(files).map(f => f.name).join(', ');
                    setFormData({ ...formData, fileName: names });
                  }
                }}
              />
            </div>
            
            {formData.fileName && (
              <div className="p-3 bg-green-900 rounded text-green-200 text-sm">
                ✓ Uploaded: {formData.fileName}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center mb-6">Review Submission</h2>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded">
                <p className="text-gray-300 text-sm">Role:</p>
                <p className="text-white font-semibold">{formData.role}</p>
              </div>
              
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
              setFormData({
                role: '',
                url: '',
                platform: '',
                date: '',
                fileName: '',
              });
            }}
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col">
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        {/* Progress Indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
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
                {['Role', 'Info', 'Analysis', 'Upload', 'Review'][s - 1]}
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
          {step < 5 && (
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

import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

export const PrivacyBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>Privacy-First & Evidence-Based Architecture</span>
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed max-w-4xl">
              This system does <strong className="font-semibold text-blue-950">not</strong> use facial recognition or store biometric student identities. 
              Participants are assigned anonymous tracking identifiers (<code className="bg-white/80 px-1 py-0.5 rounded text-blue-900 font-mono text-[11px]">Participant #01</code>) 
              based purely on upper-body detections. Measured movement and audio indicators reflect physical classroom dynamics; 
              inactivity or looking down is not assumed to indicate inattention.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-blue-500 hover:text-blue-700 p-1 rounded-md transition-colors"
          aria-label="Dismiss privacy notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

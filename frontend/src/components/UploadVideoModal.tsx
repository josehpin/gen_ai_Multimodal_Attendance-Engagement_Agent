import React, { useState, useRef } from 'react';
import { X, UploadCloud, Film, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { api } from '../services/api';

interface UploadVideoModalProps {
  isOpen: boolean;
  sessionId: string;
  sessionTitle: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadVideoModal: React.FC<UploadVideoModalProps> = ({
  isOpen,
  sessionId,
  sessionTitle,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!validExtensions.includes(ext)) {
        setError(`Please select a supported video format (${validExtensions.join(', ')}).`);
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const res = await api.uploadVideo(sessionId, selectedFile, (pct) => {
        setUploadProgress(pct);
      });

      if (res.success) {
        // Automatically start processing
        await api.processSession(sessionId);
        onUploadSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upload video. Please ensure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Classroom Video</h3>
              <p className="text-[11px] text-slate-600 truncate max-w-xs">{sessionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-600 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${selectedFile 
                ? 'border-blue-400 bg-blue-50/40' 
                : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Film className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div>
                  <div className="text-xs font-semibold text-slate-900 mb-1 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-slate-800 mb-1">
                    Click to select a classroom video or drop it here
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Supports MP4, AVI, MOV, WebM (up to 500 MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar during upload */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Uploading to server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700">What happens next:</div>
            <div>• Video is processed locally by the OpenCV computer vision engine.</div>
            <div>• Person detection extracts anonymous attendee counts, presence durations, and movement.</div>
            <div>• No biometric faces are stored, preserving institutional privacy.</div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Start Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

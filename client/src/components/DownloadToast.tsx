import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { backgroundLibraryLoader, LoadingProgress } from '../services/backgroundLibraryLoader';

interface DownloadToastProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const DownloadToast: React.FC<DownloadToastProps> = ({
  isVisible,
  onDismiss
}) => {
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let isActive = true;

    const startBackgroundLoading = async () => {
      try {
        await backgroundLibraryLoader.startBackgroundLoading(
          (newProgress) => {
            if (isActive) {
              setProgress(newProgress);
              
              // Auto-complete when done
              if (newProgress.percentage >= 100) {
                setIsComplete(true);
                setTimeout(() => {
                  if (isActive) {
                    onDismiss();
                  }
                }, 3000); // Auto-dismiss after 3 seconds
              }
            }
          },
          'normal' // Normal priority for background loading
        );
      } catch (error) {
        console.error('[DownloadToast] Loading error:', error);
      }
    };

    startBackgroundLoading();

    return () => {
      isActive = false;
      backgroundLibraryLoader.stopLoading();
    };
  }, [isVisible, onDismiss]);

  if (!isVisible || !progress) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressColor = (): string => {
    if (isComplete) return 'bg-green-500';
    if (progress.percentage < 25) return 'bg-amber-500';
    if (progress.percentage < 75) return 'bg-sky-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (navigator.onLine) return <Wifi className="w-4 h-4 text-sky-400" />;
    return <WifiOff className="w-4 h-4 text-red-400" />;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-slate-800 border border-slate-600 rounded-full p-3 shadow-lg hover:bg-slate-700 transition-colors"
        >
          <Download className="w-5 h-5 text-sky-400" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {progress.percentage}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-white">
              {isComplete ? 'Téléchargement terminé' : 'Téléchargement hors-ligne'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              title="Réduire"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isComplete && (
          <>
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{progress.loaded} / {progress.total} textes</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Current Status */}
            <div className="text-xs text-gray-400">
              <div className="truncate mb-1">
                En cours: {progress.currentBook.replace(/\./g, ' • ')}
              </div>
              {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                <div>
                  Temps restant: ~{formatTime(progress.estimatedTimeRemaining)}
                </div>
              )}
            </div>
          </>
        )}

        {isComplete && (
          <div className="text-sm text-green-400">
            ✓ {progress.loaded} textes disponibles hors-ligne
          </div>
        )}
      </div>
    </div>
  );
};
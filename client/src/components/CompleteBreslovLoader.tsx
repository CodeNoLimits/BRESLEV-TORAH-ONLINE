import React, { useState, useEffect } from 'react';
import { Download, Book, CheckCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { breslovBulkLoader, BulkLoadProgress, CompleteBreslovLibrary } from '../services/breslovBulkLoader';

interface CompleteBreslovLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  onLibraryLoaded: (library: CompleteBreslovLibrary) => void;
}

export const CompleteBreslovLoader: React.FC<CompleteBreslovLoaderProps> = ({
  isOpen,
  onClose,
  onLibraryLoaded
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<BulkLoadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    currentBook: '',
    errors: [],
    totalSegments: 0,
    loadedSegments: 0
  });
  const [library, setLibrary] = useState<CompleteBreslovLibrary | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      breslovBulkLoader.loadProgress();
      setProgress(breslovBulkLoader.getProgress());
    }
  }, [isOpen]);

  const handleStartLoad = async () => {
    setIsLoading(true);
    setStartTime(new Date());
    setProgress(prev => ({ ...prev, errors: [] }));

    try {
      console.log('[CompleteBreslovLoader] Starting complete library load...');
      
      const loadedLibrary = await breslovBulkLoader.loadCompleteLibrary((newProgress) => {
        setProgress(newProgress);
        breslovBulkLoader.saveProgress();
      });

      setLibrary(loadedLibrary);
      onLibraryLoaded(loadedLibrary);
      
      console.log(`[CompleteBreslovLoader] Complete library loaded: ${loadedLibrary.metadata.totalSegments} segments`);
      
    } catch (error) {
      console.error('[CompleteBreslovLoader] Error loading library:', error);
      setProgress(prev => ({
        ...prev,
        errors: [...prev.errors, `Loading failed: ${error}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatElapsedTime = (): string => {
    if (!startTime) return '0s';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const estimateTimeRemaining = (): string => {
    if (!startTime || progress.percentage === 0) return 'Calculating...';
    
    const elapsed = Date.now() - startTime.getTime();
    const totalEstimated = (elapsed / progress.percentage) * 100;
    const remaining = Math.max(0, totalEstimated - elapsed);
    
    const remainingSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-600">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Download className="w-6 h-6 text-amber-400" />
            Complete Breslov Library Loader
          </h2>
          <p className="text-gray-300 mt-2">
            Load ALL Breslov books with ALL segments from Sefaria
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Library Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <Book className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white">1,381</div>
              <div className="text-sm text-gray-400">Total Texts</div>
            </div>
            
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white">~50,000</div>
              <div className="text-sm text-gray-400">Est. Segments</div>
            </div>
            
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white">10</div>
              <div className="text-sm text-gray-400">Categories</div>
            </div>
            
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <AlertCircle className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white">~5M</div>
              <div className="text-sm text-gray-400">Est. Words</div>
            </div>
          </div>

          {/* Books Breakdown */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-semibold text-white mb-3">Complete Collection:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Likutei Moharan:</span>
                <span className="text-white font-medium">286 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sichot HaRan:</span>
                <span className="text-white font-medium">307 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Likutei Tefilot:</span>
                <span className="text-white font-medium">210 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Likkutei Etzot:</span>
                <span className="text-white font-medium">200 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Moharan Tinyana:</span>
                <span className="text-white font-medium">125 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sefer HaMiddot:</span>
                <span className="text-white font-medium">100 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Chayei + Shivchei:</span>
                <span className="text-white font-medium">100 texts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Others:</span>
                <span className="text-white font-medium">53 texts</span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {isLoading && (
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Loading Progress</h3>
                <div className="text-sm text-gray-400">
                  {formatElapsedTime()} elapsed • {estimateTimeRemaining()} remaining
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Main Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Overall Progress</span>
                    <span className="text-white">{progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div 
                      className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {progress.loaded} of {progress.total} texts loaded
                  </div>
                </div>

                {/* Segments Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Segments Loaded</span>
                    <span className="text-white">{progress.loadedSegments.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-1">
                    <div 
                      className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (progress.loadedSegments / progress.totalSegments) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Book */}
                {progress.currentBook && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span className="text-gray-300">Loading:</span>
                    <span className="text-white font-medium">{progress.currentBook}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {library && !isLoading && (
            <div className="bg-green-900/20 border border-green-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-green-400">Library Loaded Successfully!</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-300">Total Books:</span>
                  <span className="text-white font-medium ml-2">{library.metadata.totalBooks}</span>
                </div>
                <div>
                  <span className="text-gray-300">Total Segments:</span>
                  <span className="text-white font-medium ml-2">{library.metadata.totalSegments.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-300">Loaded At:</span>
                  <span className="text-white font-medium ml-2">{library.metadata.loadedAt.toLocaleTimeString()}</span>
                </div>
                <div>
                  <span className="text-gray-300">Categories:</span>
                  <span className="text-white font-medium ml-2">{library.metadata.categories.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-red-400">Errors ({progress.errors.length})</h3>
              </div>
              <div className="text-sm text-gray-300 max-h-32 overflow-y-auto">
                {progress.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="mb-1">• {error}</div>
                ))}
                {progress.errors.length > 5 && (
                  <div className="text-gray-400 italic">...and {progress.errors.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={handleStartLoad}
              disabled={isLoading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 
                         text-white font-medium py-3 px-6 rounded-lg transition-colors
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading Complete Library...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Load ALL Books & Segments
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 border border-slate-500 text-gray-300 hover:text-white 
                         hover:border-slate-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
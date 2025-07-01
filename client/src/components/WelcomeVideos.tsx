
import React, { useState } from 'react';

export const WelcomeVideos: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const closeVideo = () => {
    setActiveVideo(null);
  };

  const openVideo = (videoSrc: string) => {
    setActiveVideo(videoSrc);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h3 className="text-2xl font-bold text-slate-200 mb-8 text-center">
        Vidéos de présentation
      </h3>
      
      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={closeVideo}
              className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors text-2xl"
            >
              ✕ Fermer
            </button>
            <video
              src={activeVideo}
              controls
              autoPlay
              className="w-full h-auto max-h-[80vh] rounded-lg"
              onError={() => {
                console.error('Erreur de lecture vidéo:', activeVideo);
                alert('Erreur de lecture de la vidéo. Vérifiez que le fichier existe.');
              }}
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Première vidéo - Introduction */}
        <div 
          className="block group cursor-pointer"
          onClick={() => window.open('/videos/intro1.mp4', '_blank', 'noopener,noreferrer')}
        >
          <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-amber-500 transition-all duration-300">
            <div className="w-full h-48 bg-slate-700 flex items-center justify-center cursor-pointer group-hover:bg-slate-600 transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-amber-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-amber-400 font-medium">Vidéo Introduction</p>
                <p className="text-slate-400 text-sm">Cliquez pour voir</p>
              </div>
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-slate-200 mb-2">
                Introduction aux enseignements
              </h4>
              <p className="text-sm text-slate-400">
                Découvrez les bases du Compagnon du Cœur et comment utiliser cette application pour votre étude spirituelle.
              </p>
            </div>
          </div>
        </div>

        {/* Deuxième vidéo - Hébreu */}
        <div 
          className="block group cursor-pointer"
          onClick={() => openVideo('/attached_assets/הלב של רבנו_1751382442951.mp4')}
        >
          <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-amber-500 transition-all duration-300">
            <div className="w-full h-48 bg-slate-700 flex items-center justify-center cursor-pointer group-hover:bg-slate-600 transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-amber-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-amber-400 font-medium" dir="rtl">הלב של רבנו</p>
                <p className="text-slate-400 text-sm">Cliquez pour voir</p>
              </div>
            </div>
            
            <div className="p-4">
              <h4 className="font-semibold text-slate-200 mb-2" dir="rtl">
                הלב של רבנו
              </h4>
              <p className="text-sm text-slate-400">
                Le cœur de notre Rabbi - Enseignements en hébreu avec sous-titres français disponibles.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-400 text-sm">
          Cliquez sur une vidéo pour la regarder directement dans l'interface.
        </p>
      </div>
    </div>
  );
};

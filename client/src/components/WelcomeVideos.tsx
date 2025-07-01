import React from 'react';

export const WelcomeVideos: React.FC = () => {
  
  const handleVideoClick = (type: 'intro' | 'hebrew') => {
    if (type === 'intro') {
      // Ouvrir l'image de démonstration pour l'instant
      window.open('/attached_assets/image_1751382791973.png', '_blank');
      console.log('[WelcomeVideos] Intro video clicked - opening demo image');
    } else {
      // Ouvrir l'image en hébreu pour l'instant
      window.open('/attached_assets/image_1751382815271.png', '_blank');
      console.log('[WelcomeVideos] Hebrew video clicked - opening demo image');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h3 className="text-2xl font-bold text-slate-200 mb-8 text-center">
        Vidéos de présentation
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Première vidéo - Introduction */}
        <div 
          className="block group cursor-pointer" 
          onClick={() => handleVideoClick('intro')}
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
          onClick={() => handleVideoClick('hebrew')}
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
          Les vidéos s'ouvrent dans un nouvel onglet pour le moment. Configuration en cours.
        </p>
      </div>
    </div>
  );
};
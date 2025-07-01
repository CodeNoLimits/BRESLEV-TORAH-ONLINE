
import React from 'react';

export const WelcomeVideos: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Première vidéo - Introduction */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          <div className="p-4">
            <h4 className="font-semibold text-slate-200 mb-2">
              Introduction aux enseignements
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Découvrez les bases du Compagnon du Cœur et comment utiliser cette application pour votre étude spirituelle.
            </p>
            <video 
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '300px' }}
              preload="metadata"
              onPlay={() => {
                console.log('[WelcomeVideos] French video started - stopping TTS');
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
            >
              <source src="/videos/intro_fr.mp4" type="video/mp4" />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>

        {/* Deuxième vidéo - Hébreu */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          <div className="p-4">
            <h4 className="font-semibold text-slate-200 mb-2" dir="rtl">
              הלב של רבנו
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Le cœur de notre Rabbi - Enseignements en hébreu avec sous-titres français disponibles.
            </p>
            <video 
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '300px' }}
              preload="metadata"
              onPlay={() => {
                console.log('[WelcomeVideos] Hebrew video started - stopping TTS');
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
            >
              <source src="/videos/intro_en.mp4" type="video/mp4" />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      </div>
    </div>
  );
};

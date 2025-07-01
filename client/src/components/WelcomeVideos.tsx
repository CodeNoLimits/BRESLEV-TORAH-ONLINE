import React from 'react';

export const WelcomeVideos: React.FC = () => {
  return (
    <div className="mt-8 max-w-4xl mx-auto">
      <h3 className="text-lg font-crimson text-amber-400 text-center mb-6">
        Découvrez les enseignements de Rabbi Nahman
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Première vidéo */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-amber-500 transition-all duration-300">
          <video
            className="w-full h-48 object-cover"
            controls
            preload="metadata"
            poster="/attached_assets/image_1751382791973.png"
          >
            <source src="/attached_assets/téléchargement (2)_1751382168037.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas les vidéos HTML5.
          </video>
          
          <div className="p-4">
            <h4 className="font-semibold text-slate-200 mb-2">
              Introduction aux enseignements
            </h4>
            <p className="text-sm text-slate-400">
              Découvrez la sagesse spirituelle de Rabbi Nahman de Breslov
            </p>
          </div>
        </div>

        {/* Deuxième vidéo */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-amber-500 transition-all duration-300">
          <video
            className="w-full h-48 object-cover"
            controls
            preload="metadata"
            poster="/attached_assets/image_1751382815271.png"
          >
            <source src="/attached_assets/הלב של רבנו_1751382442951.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas les vidéos HTML5.
          </video>
          
          <div className="p-4">
            <h4 className="font-semibold text-slate-200 mb-2" dir="rtl">
              הלב של רבנו
            </h4>
            <p className="text-sm text-slate-400">
              Le cœur de notre Rabbi - Enseignements en hébreu
            </p>
          </div>
        </div>
      </div>

      {/* Description discrète */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          Cliquez sur les vidéos pour les regarder • Compatible mobile et desktop
        </p>
      </div>
    </div>
  );
};
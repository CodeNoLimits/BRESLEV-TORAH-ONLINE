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
            className="w-full h-48 object-cover cursor-pointer"
            controls
            preload="metadata"
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23334155'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='18' fill='%23f59e0b' text-anchor='middle' dy='.3em'%3EVidéo 1%3C/text%3E%3C/svg%3E"
            onClick={(e) => {
              const video = e.target as HTMLVideoElement;
              console.log('[WelcomeVideos] Video clicked - play/pause');
              if (video.paused) {
                video.play().catch(err => console.log('[WelcomeVideos] Video play error:', err));
              } else {
                video.pause();
              }
            }}
          >
            <source src="data:video/mp4;base64," type="video/mp4" />
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
            className="w-full h-48 object-cover cursor-pointer"
            controls
            preload="metadata"
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23334155'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='18' fill='%23f59e0b' text-anchor='middle' dy='.3em'%3Eהלב של רבנו%3C/text%3E%3C/svg%3E"
            onClick={(e) => {
              const video = e.target as HTMLVideoElement;
              console.log('[WelcomeVideos] Hebrew video clicked - play/pause');
              if (video.paused) {
                video.play().catch(err => console.log('[WelcomeVideos] Video play error:', err));
              } else {
                video.pause();
              }
            }}
          >
            <source src="data:video/mp4;base64," type="video/mp4" />
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
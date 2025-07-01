import React from 'react';

const WelcomeVideos: React.FC = () => {
  const videos = [
    {
      src: "/videos/intro_fr.mp4",
      title: "Introduction Française"
    },
    {
      src: "/videos/intro_en.mp4", 
      title: "Introduction English"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {videos.map((video) => (
        <video
          key={video.src}
          className="rounded-xl shadow-lg w-full"
          src={video.src}
          controls
          preload="metadata"
          onLoadStart={() => console.log(`[Video] Loading: ${video.src}`)}
          onLoadedData={() => console.log(`[Video] Loaded: ${video.src}`)}
          onError={(e) => console.error(`[Video] Error loading: ${video.src}`, e)}
          onPlay={() => window.dispatchEvent(new Event("videoPlaying"))}
        />
      ))}
    </div>
  );
};

export { WelcomeVideos };
import React from "react";

export const WelcomeVideos: React.FC = () => {
  const vids = [
    { src: "/videos/intro_fr.mp4", title: "Introduction (FR)" },
    { src: "/videos/intro_en.mp4", title: "Introduction (EN)" }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {vids.map(v => (
        <video
          key={v.src}
          className="rounded-xl shadow-lg w-full"
          src={v.src}
          controls
          onPlay={() => window.dispatchEvent(new Event("videoPlaying"))}
        />
      ))}
    </div>
  );
};

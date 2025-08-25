import { useState } from 'react';

interface VideoIframeProps {
  src: string;
  title?: string;
  className?: string;
}

export const VideoIframe = ({
  src,
  title = "Vidéo LiberChat",
  className = ""
}: VideoIframeProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`video-iframe-container ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-red-400 font-mono">
          📹 Vidéo Chat
        </h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-red-700 hover:bg-red-800 text-white font-mono px-3 py-1 rounded text-sm transition-colors"
          aria-label={isVisible ? "Masquer la vidéo" : "Afficher la vidéo"}
        >
          {isVisible ? "Masquer" : "Afficher"}
        </button>
      </div>

      <div
        className={`relative w-full bg-black rounded-lg border-2 border-red-700 overflow-hidden shadow-lg transition-all duration-300 ${isVisible ? 'block' : 'hidden'
          }`}
      >
        <div className="w-full h-[calc(100vh-16rem)] sm:h-[36rem] lg:h-[42rem]">
          <iframe
            src={src}
            title={title}
            className="w-full h-full touch-manipulation"
            style={{ touchAction: 'manipulation' }}
            frameBorder="0"
            allow="camera; microphone; autoplay; encrypted-media; fullscreen; display-capture; geolocation; screen-wake-lock"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
};
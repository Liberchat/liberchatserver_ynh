import { useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Spoof desktop user agent for iframe
  const desktopSrc = `${src}${src.includes('?') ? '&' : '?'}ua=Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F120.0.0.0%20Safari%2F537.36&mobile=0&desktop=1`;

  const openInNewWindow = () => {
    window.open(src, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

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
        <div className="w-full h-[calc(100vh-16rem)] sm:h-[36rem] lg:h-[42rem] touch-manipulation">
          <iframe
            src={src}
            title={title}
            className="w-full h-full touch-manipulation select-none"
            style={{ 
              touchAction: 'manipulation',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            frameBorder="0"
            allow="camera; microphone; autoplay; encrypted-media; fullscreen; display-capture; geolocation; screen-wake-lock"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
            onLoad={(e) => {
              if (isMobile) {
                try {
                  const iframe = e.target as HTMLIFrameElement;
                  const doc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (doc) {
                    // Force desktop viewport
                    const viewport = doc.createElement('meta');
                    viewport.name = 'viewport';
                    viewport.content = 'width=1024, initial-scale=1.0';
                    doc.head?.appendChild(viewport);
                    
                    // Override user agent detection
                    const script = doc.createElement('script');
                    script.textContent = `
                      Object.defineProperty(navigator, 'userAgent', {
                        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                      });
                      Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                      });
                      window.innerWidth = 1024;
                      window.innerHeight = 768;
                    `;
                    doc.head?.appendChild(script);
                  }
                } catch (e) {
                  console.log('Cannot modify iframe content due to CORS');
                }
              }
            }}
          />
        </div>
        {isMobile && (
          <div className="mt-2 text-center p-2">
            <button
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.backgroundColor = '#7f1d1d';
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#b91c1c';
                setTimeout(() => openInNewWindow(), 100);
              }}
              onTouchCancel={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              className="bg-red-700 text-white font-mono px-6 py-3 rounded-lg text-base font-bold shadow-lg border-2 border-red-600 min-h-[48px] min-w-[200px]"
              style={{ 
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
            >
              🎞️ Ouvrir Vidéo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
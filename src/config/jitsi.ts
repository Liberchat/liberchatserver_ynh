/**
 * Configuration Jitsi pour LibreChat
 */

export interface JitsiConfig {
  defaultUrl: string;
  roomPrefix: string;
  config: Record<string, any>;
  interfaceConfig: Record<string, any>;
}

/**
 * Configuration par défaut pour Jitsi Meet
 */
export const defaultJitsiConfig: JitsiConfig = {
  defaultUrl: 'https://meet.jit.si',
  roomPrefix: 'liberchat',
  
  config: {
    // Audio/Vidéo
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    
    // Interface
    prejoinPageEnabled: false,
    enableWelcomePage: false,
    enableClosePage: false,
    disableDeepLinking: true,
    
    // Fonctionnalités
    enableEmailInStats: false,
    enableUserRolesBasedOnToken: false,
    enableInsecureRoomNameWarning: false,
    
    // Sécurité et confidentialité
    disableThirdPartyRequests: true,
    enableNoAudioDetection: true,
    enableNoisyMicDetection: true,
    
    // Performance
    resolution: 720,
    constraints: {
      video: {
        height: { ideal: 720, max: 1080, min: 240 },
        width: { ideal: 1280, max: 1920, min: 320 }
      }
    },
    
    // Outils
    toolbarButtons: [
      'microphone', 'camera', 'closedcaptions', 'desktop',
      'fullscreen', 'fodeviceselection', 'hangup', 'profile',
      'chat', 'recording', 'livestreaming', 'etherpad',
      'sharedvideo', 'settings', 'raisehand', 'videoquality',
      'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
      'tileview', 'videobackgroundblur', 'download', 'help'
    ]
  },
  
  interfaceConfig: {
    // Branding
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    JITSI_WATERMARK_LINK: '',
    
    // Promotions
    MOBILE_APP_PROMO: false,
    SHOW_CHROME_EXTENSION_BANNER: false,
    
    // Interface
    DISABLE_VIDEO_BACKGROUND: false,
    DISABLE_FOCUS_INDICATOR: false,
    DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
    
    // Toolbar
    TOOLBAR_ALWAYS_VISIBLE: false,
    TOOLBAR_TIMEOUT: 4000,
    
    // Chat
    DISABLE_PRIVATE_MESSAGES: false,
    
    // Autres
    LANG_DETECTION: true,
    LIVE_STREAMING_HELP_LINK: '',
    SUPPORT_URL: ''
  }
};

/**
 * Configuration optimisée pour les WebViews
 */
export const webViewJitsiConfig: Partial<JitsiConfig> = {
  config: {
    ...defaultJitsiConfig.config,
    // Optimisations WebView
    disableAP: true,
    disableH264: false,
    enableLayerSuspension: true,
    
    // Interface simplifiée
    toolbarButtons: [
      'microphone', 'camera', 'hangup', 'chat',
      'raisehand', 'tileview', 'settings'
    ]
  },
  
  interfaceConfig: {
    ...defaultJitsiConfig.interfaceConfig,
    // Interface plus simple pour mobile
    TOOLBAR_ALWAYS_VISIBLE: true,
    DISABLE_FOCUS_INDICATOR: true
  }
};

/**
 * Configuration optimisée pour mobile
 */
export const mobileJitsiConfig: Partial<JitsiConfig> = {
  config: {
    ...defaultJitsiConfig.config,
    // Optimisations mobile
    resolution: 480,
    constraints: {
      video: {
        height: { ideal: 480, max: 720, min: 240 },
        width: { ideal: 640, max: 1280, min: 320 }
      }
    },
    
    // Interface mobile
    toolbarButtons: [
      'microphone', 'camera', 'hangup', 'chat', 'raisehand'
    ]
  }
};

/**
 * Génère l'URL Jitsi avec la configuration appropriée
 */
export function buildJitsiUrl(
  baseUrl: string,
  roomName: string,
  config: Partial<JitsiConfig> = {},
  isWebView: boolean = false,
  isMobile: boolean = false
): string {
  // Choisir la configuration appropriée
  let finalConfig = { ...defaultJitsiConfig };
  
  if (isWebView) {
    finalConfig = mergeConfigs(finalConfig, webViewJitsiConfig);
  } else if (isMobile) {
    finalConfig = mergeConfigs(finalConfig, mobileJitsiConfig);
  }
  
  // Appliquer la configuration personnalisée
  if (config.config || config.interfaceConfig) {
    finalConfig = mergeConfigs(finalConfig, config);
  }
  
  // Construire les paramètres URL
  const params = new URLSearchParams();
  
  // Ajouter les paramètres de configuration
  Object.entries(finalConfig.config).forEach(([key, value]) => {
    if (typeof value === 'object') {
      params.set(`config.${key}`, JSON.stringify(value));
    } else {
      params.set(`config.${key}`, String(value));
    }
  });
  
  // Ajouter les paramètres d'interface
  Object.entries(finalConfig.interfaceConfig).forEach(([key, value]) => {
    if (typeof value === 'object') {
      params.set(`interfaceConfig.${key}`, JSON.stringify(value));
    } else {
      params.set(`interfaceConfig.${key}`, String(value));
    }
  });
  
  // Construire l'URL finale
  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
  const fullRoomName = `${finalConfig.roomPrefix}-${cleanRoomName}`;
  
  return `${baseUrl}/${fullRoomName}?${params.toString()}`;
}

/**
 * Fusionne deux configurations Jitsi
 */
function mergeConfigs(base: JitsiConfig, override: Partial<JitsiConfig>): JitsiConfig {
  return {
    ...base,
    config: { ...base.config, ...override.config },
    interfaceConfig: { ...base.interfaceConfig, ...override.interfaceConfig }
  };
}

/**
 * Génère un nom de salle basé sur la date et un identifiant
 */
export function generateRoomName(identifier?: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const suffix = identifier || Math.random().toString(36).substring(2, 8);
  return `${today}-${suffix}`;
}
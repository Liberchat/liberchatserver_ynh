/**
 * Utilitaires pour la détection et gestion des WebViews
 */

export interface WebViewInfo {
  isWebView: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: string;
}

/**
 * Détecte l'environnement d'exécution (WebView, mobile, etc.)
 */
export function detectWebView(): WebViewInfo {
  const userAgent = navigator.userAgent;
  
  // Détection mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  
  // Détection WebView plus précise
  const isWebView = 
    // WebView générique
    /wv|WebView|; wv\)|Version\/[\d\.]+.*Safari/i.test(userAgent) ||
    // Standalone iOS (PWA)
    (window.navigator as any).standalone === false ||
    // Android WebView
    (isAndroid && /Version\/\d+\.\d+/.test(userAgent) && !/Chrome\/\d+\.\d+/.test(userAgent)) ||
    // Capacitor/Cordova
    !!(window as any).Capacitor ||
    !!(window as any).cordova ||
    // Electron
    !!(window as any).electronAPI ||
    // YunoHost WebView ou autres environnements intégrés
    window.location.protocol === 'file:' ||
    // Détection par absence de certaines APIs
    !(window as any).chrome ||
    // Détection par la présence d'interfaces spécifiques
    !!(window as any).webkit?.messageHandlers;

  let platform = 'unknown';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (isMobile) platform = 'mobile';
  else platform = 'desktop';

  return {
    isWebView,
    isMobile,
    isIOS,
    isAndroid,
    platform
  };
}

/**
 * Ouvre une URL de manière optimisée selon l'environnement
 */
export function openUrl(url: string, target: string = '_blank'): void {
  const webViewInfo = detectWebView();
  
  if (webViewInfo.isWebView) {
    // Dans une WebView, essayer différentes méthodes
    try {
      // Essayer d'ouvrir avec l'app système (Android)
      if (webViewInfo.isAndroid && (window as any).open) {
        (window as any).open(url, '_system');
        return;
      }
      
      // Essayer Capacitor
      if ((window as any).Capacitor?.Plugins?.Browser) {
        (window as any).Capacitor.Plugins.Browser.open({ url });
        return;
      }
      
      // Fallback: redirection complète
      window.location.href = url;
    } catch (error) {
      console.warn('Erreur lors de l\'ouverture de l\'URL:', error);
      window.location.href = url;
    }
  } else {
    // Navigateur normal
    window.open(url, target);
  }
}

/**
 * Sauvegarde l'état pour le retour depuis une application externe
 */
export function saveReturnState(roomName: string, additionalData?: Record<string, any>): void {
  const returnData = {
    url: window.location.href,
    roomName,
    timestamp: Date.now(),
    ...additionalData
  };
  
  try {
    sessionStorage.setItem('liberchat_return_url', returnData.url);
    sessionStorage.setItem('liberchat_room_name', returnData.roomName);
    sessionStorage.setItem('liberchat_jitsi_timestamp', returnData.timestamp.toString());
    
    if (additionalData) {
      sessionStorage.setItem('liberchat_additional_data', JSON.stringify(additionalData));
    }
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde de l\'état de retour:', error);
  }
}

/**
 * Récupère et nettoie l'état de retour
 */
export function getAndClearReturnState(): {
  returnUrl?: string;
  roomName?: string;
  timestamp?: number;
  additionalData?: Record<string, any>;
} | null {
  try {
    const returnUrl = sessionStorage.getItem('liberchat_return_url');
    const roomName = sessionStorage.getItem('liberchat_room_name');
    const timestampStr = sessionStorage.getItem('liberchat_jitsi_timestamp');
    const additionalDataStr = sessionStorage.getItem('liberchat_additional_data');
    
    if (!returnUrl || !roomName) {
      return null;
    }
    
    // Nettoyer le sessionStorage
    sessionStorage.removeItem('liberchat_return_url');
    sessionStorage.removeItem('liberchat_room_name');
    sessionStorage.removeItem('liberchat_jitsi_timestamp');
    sessionStorage.removeItem('liberchat_additional_data');
    
    const timestamp = timestampStr ? parseInt(timestampStr) : Date.now();
    const additionalData = additionalDataStr ? JSON.parse(additionalDataStr) : undefined;
    
    return {
      returnUrl,
      roomName,
      timestamp,
      additionalData
    };
  } catch (error) {
    console.warn('Erreur lors de la récupération de l\'état de retour:', error);
    return null;
  }
}

/**
 * Vérifie si l'état de retour est valide (pas trop ancien)
 */
export function isReturnStateValid(maxAgeMs: number = 3600000): boolean {
  try {
    const timestampStr = sessionStorage.getItem('liberchat_jitsi_timestamp');
    if (!timestampStr) return false;
    
    const timestamp = parseInt(timestampStr);
    const now = Date.now();
    const age = now - timestamp;
    
    return age <= maxAgeMs;
  } catch (error) {
    return false;
  }
}
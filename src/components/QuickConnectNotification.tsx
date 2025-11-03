import { useState, useEffect } from 'react';
import { Zap, X, Settings } from 'lucide-react';

interface QuickConnectNotificationProps {
  username: string;
  onOpenSettings: () => void;
}

export function QuickConnectNotification({ username, onOpenSettings }: QuickConnectNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu cette notification
    const hasSeenNotification = localStorage.getItem('liberchat_seen_quick_connect_notification');
    const autoConnect = localStorage.getItem('liberchat_auto_connect');
    
    // Afficher la notification si l'utilisateur ne l'a pas vue et n'a pas encore activé la connexion auto
    if (!hasSeenNotification && autoConnect !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('liberchat_seen_quick_connect_notification', 'true');
    setIsVisible(false);
  };

  const handleEnableQuickConnect = () => {
    localStorage.setItem('liberchat_username', username);
    localStorage.setItem('liberchat_auto_connect', 'true');
    localStorage.setItem('liberchat_remember_username', 'true');
    localStorage.setItem('liberchat_seen_quick_connect_notification', 'true');
    setIsVisible(false);
    
    // Afficher une confirmation
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = '✅ Connexion automatique activée !';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <Zap className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold mb-1">Connexion Rapide</h3>
          <p className="text-sm mb-3">
            Activez la connexion automatique pour éviter de saisir votre nom à chaque fois !
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnableQuickConnect}
              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded text-sm transition-colors"
            >
              Activer
            </button>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-sm transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Options
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
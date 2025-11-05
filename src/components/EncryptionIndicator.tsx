import React from 'react';
import { Lock, Unlock, AlertTriangle, Loader, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export type EncryptionStatus = 'encrypted' | 'encrypting' | 'error' | 'unsecured' | 'decrypting';

export interface EncryptionIndicatorProps {
  status: EncryptionStatus;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
  errorMessage?: string;
}

export interface SecurityStatus {
  encrypted: boolean;
  keyExchanged: boolean;
  peersVerified: number;
  lastKeyRotation?: number;
  algorithm: string;
  strength: 'weak' | 'medium' | 'strong';
}

export interface GroupSecurityIndicatorProps {
  status: SecurityStatus;
  groupName: string;
  memberCount: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

/**
 * Composant d'indicateur de chiffrement discret pour les messages individuels
 */
export const EncryptionIndicator: React.FC<EncryptionIndicatorProps> = ({
  status,
  size = 'sm',
  showTooltip = true,
  className = '',
  onClick,
  errorMessage
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getIcon = () => {
    switch (status) {
      case 'encrypted':
        return <Lock className={`${sizeClasses[size]} text-green-500`} />;
      case 'encrypting':
      case 'decrypting':
        return <Loader className={`${sizeClasses[size]} text-yellow-500 animate-spin`} />;
      case 'error':
        return <AlertTriangle className={`${sizeClasses[size]} text-red-500`} />;
      case 'unsecured':
        return <Unlock className={`${sizeClasses[size]} text-gray-400`} />;
      default:
        return <Lock className={`${sizeClasses[size]} text-gray-400`} />;
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case 'encrypted':
        return 'Message chiffré de bout en bout';
      case 'encrypting':
        return 'Chiffrement en cours...';
      case 'decrypting':
        return 'Déchiffrement en cours...';
      case 'error':
        return errorMessage || 'Erreur de chiffrement - Cliquez pour réessayer';
      case 'unsecured':
        return 'Message non chiffré';
      default:
        return 'Statut de chiffrement inconnu';
    }
  };

  const baseClasses = `inline-flex items-center justify-center transition-all duration-200 ${className}`;
  const interactiveClasses = onClick ? 'cursor-pointer hover:scale-110' : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
      title={showTooltip ? getTooltipText() : undefined}
      role={onClick ? 'button' : 'img'}
      aria-label={getTooltipText()}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {getIcon()}
    </div>
  );
};

/**
 * Composant d'indicateur de sécurité pour les groupes
 */
export const GroupSecurityIndicator: React.FC<GroupSecurityIndicatorProps> = ({
  status,
  groupName,
  memberCount,
  size = 'md',
  showDetails = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getSecurityIcon = () => {
    if (!status.encrypted) {
      return <ShieldAlert className={`${sizeClasses[size]} text-red-500`} />;
    }

    switch (status.strength) {
      case 'strong':
        return <ShieldCheck className={`${sizeClasses[size]} text-green-500`} />;
      case 'medium':
        return <Shield className={`${sizeClasses[size]} text-yellow-500`} />;
      case 'weak':
        return <ShieldAlert className={`${sizeClasses[size]} text-orange-500`} />;
      default:
        return <Shield className={`${sizeClasses[size]} text-gray-400`} />;
    }
  };

  const getSecurityText = () => {
    if (!status.encrypted) {
      return 'Non sécurisé';
    }

    const strengthText = {
      strong: 'Très sécurisé',
      medium: 'Sécurisé',
      weak: 'Faiblement sécurisé'
    };

    return strengthText[status.strength] || 'Sécurité inconnue';
  };

  const getDetailedTooltip = () => {
    const lines = [
      `Groupe: ${groupName}`,
      `Membres: ${memberCount}`,
      `Chiffrement: ${status.encrypted ? 'Activé' : 'Désactivé'}`,
      `Algorithme: ${status.algorithm}`,
      `Clés échangées: ${status.keyExchanged ? 'Oui' : 'Non'}`,
      `Pairs vérifiés: ${status.peersVerified}/${memberCount - 1}`
    ];

    if (status.lastKeyRotation) {
      const rotationDate = new Date(status.lastKeyRotation).toLocaleDateString('fr-FR');
      lines.push(`Dernière rotation: ${rotationDate}`);
    }

    return lines.join('\n');
  };

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      title={getDetailedTooltip()}
      role="img"
      aria-label={`Sécurité du groupe: ${getSecurityText()}`}
    >
      {getSecurityIcon()}
      {showDetails && (
        <span className={`text-xs font-mono ${
          status.encrypted 
            ? status.strength === 'strong' 
              ? 'text-green-400' 
              : status.strength === 'medium' 
                ? 'text-yellow-400' 
                : 'text-orange-400'
            : 'text-red-400'
        }`}>
          {getSecurityText()}
        </span>
      )}
    </div>
  );
};

/**
 * Hook pour gérer les notifications de sécurité
 */
export const useSecurityNotifications = () => {
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: 'key-rotation' | 'security-upgrade' | 'key-exchange' | 'error';
    message: string;
    timestamp: number;
  }>>([]);

  const addNotification = React.useCallback((
    type: 'key-rotation' | 'security-upgrade' | 'key-exchange' | 'error',
    message: string
  ) => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notifyKeyRotation = React.useCallback((context: string) => {
    addNotification('key-rotation', `Clés de sécurité mises à jour pour ${context}`);
  }, [addNotification]);

  const notifySecurityUpgrade = React.useCallback(() => {
    addNotification('security-upgrade', 'Niveau de sécurité amélioré');
  }, [addNotification]);

  const notifyKeyExchange = React.useCallback((groupName: string) => {
    addNotification('key-exchange', `Échange de clés réussi pour le groupe ${groupName}`);
  }, [addNotification]);

  const notifyError = React.useCallback((message: string) => {
    addNotification('error', message);
  }, [addNotification]);

  return {
    notifications,
    removeNotification,
    notifyKeyRotation,
    notifySecurityUpgrade,
    notifyKeyExchange,
    notifyError
  };
};

/**
 * Composant de notification de sécurité discrète
 */
export const SecurityNotification: React.FC<{
  notification: {
    id: string;
    type: 'key-rotation' | 'security-upgrade' | 'key-exchange' | 'error';
    message: string;
    timestamp: number;
  };
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'key-rotation':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'security-upgrade':
        return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'key-exchange':
        return <Lock className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-900/80 border-red-700';
      case 'security-upgrade':
      case 'key-exchange':
        return 'bg-green-900/80 border-green-700';
      case 'key-rotation':
        return 'bg-red-900/80 border-red-700';
      default:
        return 'bg-gray-900/80 border-gray-700';
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      flex items-center gap-2 
      px-3 py-2 rounded-lg border
      ${getBgColor()}
      text-white text-sm font-mono
      animate-in slide-in-from-right-full duration-300
      max-w-sm
    `}>
      {getIcon()}
      <span className="flex-1">{notification.message}</span>
      <button
        onClick={() => onClose(notification.id)}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  );
};

export default EncryptionIndicator;
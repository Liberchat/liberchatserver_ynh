/**
 * CryptoDiagnostics - Interface de diagnostic cryptographique pour utilisateurs avancés
 * 
 * Ce composant fournit:
 * - Affichage des clés utilisées (sans les révéler)
 * - Métriques de performance du chiffrement
 * - Informations détaillées sur le système de sécurité
 * - Outils de diagnostic et maintenance
 * 
 * Requirements: 10.1, 10.2
 */

import { useState, useEffect } from 'react';
import { Shield, Key, Activity, AlertTriangle, CheckCircle, Clock, Database, Cpu, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { cryptoManager } from '../utils/CryptoManager';
import type { KeyMetadata } from '../utils/SecureStorage';

interface CryptoStats {
  cacheSize: number;
  maxCacheSize: number;
  totalStoredKeys: number;
  storageStats: any;
}

interface KeyInfo {
  context: string;
  metadata: KeyMetadata | null;
  isInCache: boolean;
  displayName: string;
  type: 'global' | 'group';
}

interface PerformanceMetrics {
  encryptionTime: number;
  decryptionTime: number;
  keyGenerationTime: number;
  storageAccessTime: number;
}

interface IntegrityCheck {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function CryptoDiagnostics() {
  const [stats, setStats] = useState<CryptoStats | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setIsLoading(true);
    try {
      // Charger les statistiques
      const cryptoStats = await cryptoManager.getCacheStats();
      setStats(cryptoStats);

      // Charger les informations sur les clés
      const keyContexts = await cryptoManager.listKeyContexts();
      const keyInfos: KeyInfo[] = [];

      for (const context of keyContexts) {
        const metadata = await cryptoManager.getKeyMetadata(context);
        const isInCache = await cryptoManager.hasKey(context);
        
        keyInfos.push({
          context,
          metadata,
          isInCache,
          displayName: getKeyDisplayName(context),
          type: context === 'global' ? 'global' : 'group'
        });
      }

      setKeys(keyInfos.sort((a, b) => {
        // Clé globale en premier, puis par nom
        if (a.type === 'global' && b.type !== 'global') return -1;
        if (a.type !== 'global' && b.type === 'global') return 1;
        return a.displayName.localeCompare(b.displayName);
      }));

      // Vérifier l'intégrité
      const integrityResult = await cryptoManager.verifyIntegrity();
      setIntegrity(integrityResult);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Erreur lors du chargement des données de diagnostic:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runPerformanceTests = async () => {
    setIsRunningTests(true);
    try {
      const testMessage = 'Message de test pour les métriques de performance';
      const metrics: PerformanceMetrics = {
        encryptionTime: 0,
        decryptionTime: 0,
        keyGenerationTime: 0,
        storageAccessTime: 0
      };

      // Test de chiffrement
      const encryptStart = performance.now();
      const encrypted = await cryptoManager.encryptMessage(testMessage);
      metrics.encryptionTime = performance.now() - encryptStart;

      // Test de déchiffrement
      const decryptStart = performance.now();
      await cryptoManager.decryptMessage(encrypted);
      metrics.decryptionTime = performance.now() - decryptStart;

      // Test de génération de clé
      const keyGenStart = performance.now();
      await cryptoManager.generateGroupKey('test_performance');
      metrics.keyGenerationTime = performance.now() - keyGenStart;

      // Test d'accès au stockage
      const storageStart = performance.now();
      await cryptoManager.getKey('global');
      metrics.storageAccessTime = performance.now() - storageStart;

      // Nettoyer la clé de test
      await cryptoManager.removeKey('group_test_performance');

      setPerformance(metrics);
    } catch (error) {
      console.error('Erreur lors des tests de performance:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getKeyDisplayName = (context: string): string => {
    if (context === 'global') {
      return 'Clé Globale';
    }
    if (context.startsWith('group_')) {
      return `Groupe: ${context.replace('group_', '')}`;
    }
    return context;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (time: number, thresholds: { good: number; warning: number }): string => {
    if (time <= thresholds.good) return 'text-green-400';
    if (time <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const exportDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      keys: keys.map(k => ({
        context: k.context,
        type: k.type,
        displayName: k.displayName,
        isInCache: k.isInCache,
        metadata: k.metadata ? {
          ...k.metadata,
          // Ne pas inclure l'ID complet pour la sécurité
          id: k.metadata.id.substring(0, 8) + '...'
        } : null
      })),
      performance,
      integrity,
      lastRefresh: lastRefresh.toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liberchat-crypto-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Chargement des données de diagnostic...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold">Diagnostic Cryptographique</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            Dernière mise à jour: {formatTimestamp(lastRefresh.getTime())}
          </span>
          <button
            onClick={loadDiagnosticData}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="Actualiser les données"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportDiagnosticReport}
            className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            title="Exporter le rapport"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statut d'intégrité */}
      {integrity && (
        <div className={`p-4 rounded-lg border-l-4 ${
          integrity.valid 
            ? 'bg-green-900/20 border-green-400' 
            : 'bg-red-900/20 border-red-400'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {integrity.valid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">
              {integrity.valid ? 'Système de sécurité opérationnel' : 'Problèmes détectés'}
            </span>
          </div>
          
          {integrity.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-red-400 mb-1">Erreurs:</div>
              <ul className="text-sm text-red-300 space-y-1">
                {integrity.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {integrity.warnings.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-yellow-400 mb-1">Avertissements:</div>
              <ul className="text-sm text-yellow-300 space-y-1">
                {integrity.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Statistiques générales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Clés Stockées</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalStoredKeys}</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Cache Mémoire</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.cacheSize}/{stats.maxCacheSize}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round((stats.cacheSize / stats.maxCacheSize) * 100)}% utilisé
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">Stockage</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.storageStats?.storageUsed ? 
                `${Math.round(stats.storageStats.storageUsed / 1024)}KB` : 
                'N/A'
              }
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium">Performance</span>
            </div>
            <div className="text-sm">
              {performance ? (
                <div className="space-y-1">
                  <div>Chiffrement: {formatDuration(performance.encryptionTime)}</div>
                  <div>Déchiffrement: {formatDuration(performance.decryptionTime)}</div>
                </div>
              ) : (
                <button
                  onClick={runPerformanceTests}
                  disabled={isRunningTests}
                  className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  {isRunningTests ? 'Test en cours...' : 'Lancer les tests'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Métriques de performance détaillées */}
      {performance && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" />
            Métriques de Performance
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Chiffrement</div>
              <div className={`text-lg font-mono ${getPerformanceColor(performance.encryptionTime, { good: 10, warning: 50 })}`}>
                {formatDuration(performance.encryptionTime)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Déchiffrement</div>
              <div className={`text-lg font-mono ${getPerformanceColor(performance.decryptionTime, { good: 10, warning: 50 })}`}>
                {formatDuration(performance.decryptionTime)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Génération de clé</div>
              <div className={`text-lg font-mono ${getPerformanceColor(performance.keyGenerationTime, { good: 100, warning: 500 })}`}>
                {formatDuration(performance.keyGenerationTime)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Accès stockage</div>
              <div className={`text-lg font-mono ${getPerformanceColor(performance.storageAccessTime, { good: 5, warning: 20 })}`}>
                {formatDuration(performance.storageAccessTime)}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            🟢 Excellent (&lt;10ms) | 🟡 Acceptable (&lt;50ms) | 🔴 Lent (&gt;50ms)
          </div>
        </div>
      )}

      {/* Liste des clés */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-400" />
          Clés Cryptographiques ({keys.length})
        </h4>
        
        {keys.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            Aucune clé trouvée
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.context} className="bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      key.type === 'global' ? 'bg-blue-400' : 'bg-green-400'
                    }`} />
                    <div>
                      <div className="font-medium">{key.displayName}</div>
                      <div className="text-sm text-gray-400">
                        ID: {key.context.substring(0, 12)}...
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className={`flex items-center gap-1 ${
                      key.isInCache ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      <Cpu className="w-3 h-3" />
                      {key.isInCache ? 'En cache' : 'Stockage'}
                    </div>
                    {key.metadata && (
                      <div className="text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        v{key.metadata.version}
                      </div>
                    )}
                  </div>
                </div>
                
                {key.metadata && (
                  <div className="mt-2 pt-2 border-t border-gray-600 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Créée:</span>
                      <div>{formatTimestamp(key.metadata.created)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Dernière utilisation:</span>
                      <div>{formatTimestamp(key.metadata.lastUsed)}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informations techniques */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Informations Techniques</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Algorithme de chiffrement:</div>
            <div className="font-mono">AES-GCM 256 bits</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Taille des vecteurs d'initialisation:</div>
            <div className="font-mono">96 bits (12 octets)</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Stockage sécurisé:</div>
            <div className="font-mono">localStorage chiffré</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Générateur d'entropie:</div>
            <div className="font-mono">crypto.getRandomValues()</div>
          </div>
        </div>
      </div>
    </div>
  );
}
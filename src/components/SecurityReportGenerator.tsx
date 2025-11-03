/**
 * SecurityReportGenerator - Générateur de rapports de sécurité exportables
 * 
 * Ce composant fournit:
 * - Génération de rapports de sécurité anonymisés
 * - Export en différents formats (JSON, texte)
 * - Analyse des métriques de sécurité
 * - Recommandations de sécurité
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { useState } from 'react';
import { FileText, Download, Shield, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { cryptoManager } from '../utils/CryptoManager';

interface SecurityReport {
  metadata: {
    generatedAt: string;
    version: string;
    reportId: string;
  };
  systemStatus: {
    operational: boolean;
    errors: string[];
    warnings: string[];
  };
  keyManagement: {
    totalKeys: number;
    globalKeyPresent: boolean;
    groupKeys: number;
    oldestKeyAge: number;
    newestKeyAge: number;
  };
  performance: {
    encryptionTime?: number;
    decryptionTime?: number;
    keyGenerationTime?: number;
    storageAccessTime?: number;
  };
  storage: {
    totalSize: number;
    cacheUtilization: number;
    storageHealth: 'good' | 'warning' | 'critical';
  };
  recommendations: string[];
  securityScore: number;
}

export function SecurityReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<SecurityReport | null>(null);

  const generateSecurityReport = async (): Promise<SecurityReport> => {
    // Collecter les données de diagnostic
    const stats = await cryptoManager.getCacheStats();
    const keyContexts = await cryptoManager.listKeyContexts();
    const integrity = await cryptoManager.verifyIntegrity();
    
    // Analyser les métadonnées des clés
    let oldestKeyAge = 0;
    let newestKeyAge = 0;
    let globalKeyPresent = false;
    let groupKeys = 0;

    for (const context of keyContexts) {
      if (context === 'global') {
        globalKeyPresent = true;
      } else if (context.startsWith('group_')) {
        groupKeys++;
      }

      const metadata = await cryptoManager.getKeyMetadata(context);
      if (metadata) {
        const age = Date.now() - metadata.created;
        if (oldestKeyAge === 0 || age > oldestKeyAge) {
          oldestKeyAge = age;
        }
        if (newestKeyAge === 0 || age < newestKeyAge) {
          newestKeyAge = age;
        }
      }
    }

    // Calculer le score de sécurité
    let securityScore = 100;
    const recommendations: string[] = [];

    // Vérifications de sécurité
    if (!integrity.valid) {
      securityScore -= 30;
      recommendations.push('Corriger les erreurs d\'intégrité détectées');
    }

    if (!globalKeyPresent) {
      securityScore -= 20;
      recommendations.push('Générer une clé globale pour sécuriser les communications');
    }

    if (oldestKeyAge > 90 * 24 * 60 * 60 * 1000) { // 90 jours
      securityScore -= 10;
      recommendations.push('Considérer la rotation des clés anciennes (>90 jours)');
    }

    if (stats.cacheSize / stats.maxCacheSize > 0.9) {
      securityScore -= 5;
      recommendations.push('Le cache des clés est presque plein, considérer un nettoyage');
    }

    if (integrity.warnings.length > 0) {
      securityScore -= 5;
      recommendations.push('Résoudre les avertissements de sécurité');
    }

    // Recommandations générales
    if (groupKeys === 0) {
      recommendations.push('Rejoindre des groupes pour tester le chiffrement de groupe');
    }

    if (recommendations.length === 0) {
      recommendations.push('Système de sécurité optimal - continuer les bonnes pratiques');
    }

    // Déterminer la santé du stockage
    let storageHealth: 'good' | 'warning' | 'critical' = 'good';
    if (integrity.errors.length > 0) {
      storageHealth = 'critical';
    } else if (integrity.warnings.length > 0) {
      storageHealth = 'warning';
    }

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        reportId: `SR-${Date.now().toString(36).toUpperCase()}`
      },
      systemStatus: {
        operational: integrity.valid,
        errors: integrity.errors,
        warnings: integrity.warnings
      },
      keyManagement: {
        totalKeys: keyContexts.length,
        globalKeyPresent,
        groupKeys,
        oldestKeyAge,
        newestKeyAge
      },
      performance: {
        // Les métriques de performance seront ajoutées si disponibles
      },
      storage: {
        totalSize: stats.storageStats?.storageUsed || 0,
        cacheUtilization: stats.cacheSize / stats.maxCacheSize,
        storageHealth
      },
      recommendations,
      securityScore: Math.max(0, securityScore)
    };
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const report = await generateSecurityReport();
      setLastReport(report);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      alert('Erreur lors de la génération du rapport de sécurité.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReportAsJSON = (report: SecurityReport) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liberchat-security-report-${report.metadata.reportId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportReportAsText = (report: SecurityReport) => {
    const formatDuration = (ms: number): string => {
      const days = Math.floor(ms / (24 * 60 * 60 * 1000));
      const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      if (days > 0) return `${days} jour(s) ${hours}h`;
      if (hours > 0) return `${hours}h`;
      return '< 1h';
    };

    const textReport = `
RAPPORT DE SÉCURITÉ LIBERCHAT
============================

Métadonnées du rapport:
- ID: ${report.metadata.reportId}
- Généré le: ${new Date(report.metadata.generatedAt).toLocaleString('fr-FR')}
- Version: ${report.metadata.version}

STATUT DU SYSTÈME
================
Opérationnel: ${report.systemStatus.operational ? 'OUI' : 'NON'}
Score de sécurité: ${report.securityScore}/100

${report.systemStatus.errors.length > 0 ? `
Erreurs détectées:
${report.systemStatus.errors.map(e => `- ${e}`).join('\n')}
` : ''}

${report.systemStatus.warnings.length > 0 ? `
Avertissements:
${report.systemStatus.warnings.map(w => `- ${w}`).join('\n')}
` : ''}

GESTION DES CLÉS
===============
- Total des clés: ${report.keyManagement.totalKeys}
- Clé globale présente: ${report.keyManagement.globalKeyPresent ? 'OUI' : 'NON'}
- Clés de groupe: ${report.keyManagement.groupKeys}
- Âge de la clé la plus ancienne: ${formatDuration(report.keyManagement.oldestKeyAge)}
- Âge de la clé la plus récente: ${formatDuration(report.keyManagement.newestKeyAge)}

STOCKAGE
========
- Taille totale: ${Math.round(report.storage.totalSize / 1024)} KB
- Utilisation du cache: ${Math.round(report.storage.cacheUtilization * 100)}%
- Santé du stockage: ${report.storage.storageHealth.toUpperCase()}

RECOMMANDATIONS
==============
${report.recommendations.map(r => `- ${r}`).join('\n')}

---
Ce rapport a été généré automatiquement par LiberChat.
Les données sont anonymisées et ne contiennent aucune information sensible.
    `.trim();

    const blob = new Blob([textReport], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liberchat-security-report-${report.metadata.reportId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStorageHealthColor = (health: string): string => {
    switch (health) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDuration = (ms: number): string => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold">Rapport de Sécurité</h3>
        </div>
        
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Générer le rapport
            </>
          )}
        </button>
      </div>

      {/* Description */}
      <div className="bg-blue-900/20 border border-blue-400/30 p-4 rounded-lg">
        <div className="text-sm text-blue-200">
          Le rapport de sécurité analyse l'état de votre système de chiffrement et fournit des recommandations 
          pour maintenir un niveau de sécurité optimal. Toutes les données sont anonymisées.
        </div>
      </div>

      {/* Rapport généré */}
      {lastReport && (
        <div className="space-y-4">
          {/* Résumé */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Résumé du Rapport</h4>
              <div className="text-sm text-gray-400">
                ID: {lastReport.metadata.reportId}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {lastReport.systemStatus.operational ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-medium">Statut</span>
                </div>
                <div className={lastReport.systemStatus.operational ? 'text-green-400' : 'text-red-400'}>
                  {lastReport.systemStatus.operational ? 'Opérationnel' : 'Problèmes détectés'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Score</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(lastReport.securityScore)}`}>
                  {lastReport.securityScore}/100
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="font-medium">Généré</span>
                </div>
                <div className="text-sm">
                  {new Date(lastReport.metadata.generatedAt).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gestion des clés */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium mb-3">Gestion des Clés</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total des clés:</span>
                  <span className="font-mono">{lastReport.keyManagement.totalKeys}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clé globale:</span>
                  <span className={lastReport.keyManagement.globalKeyPresent ? 'text-green-400' : 'text-red-400'}>
                    {lastReport.keyManagement.globalKeyPresent ? 'Présente' : 'Manquante'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clés de groupe:</span>
                  <span className="font-mono">{lastReport.keyManagement.groupKeys}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clé la plus ancienne:</span>
                  <span className="font-mono">{formatDuration(lastReport.keyManagement.oldestKeyAge)}</span>
                </div>
              </div>
            </div>

            {/* Stockage */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium mb-3">Stockage</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Taille totale:</span>
                  <span className="font-mono">{Math.round(lastReport.storage.totalSize / 1024)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache utilisé:</span>
                  <span className="font-mono">{Math.round(lastReport.storage.cacheUtilization * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Santé:</span>
                  <span className={getStorageHealthColor(lastReport.storage.storageHealth)}>
                    {lastReport.storage.storageHealth.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommandations */}
          {lastReport.recommendations.length > 0 && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium mb-3">Recommandations</h5>
              <ul className="space-y-1 text-sm">
                {lastReport.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions d'export */}
          <div className="flex gap-3">
            <button
              onClick={() => exportReportAsJSON(lastReport)}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter JSON
            </button>
            <button
              onClick={() => exportReportAsText(lastReport)}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Exporter Texte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}